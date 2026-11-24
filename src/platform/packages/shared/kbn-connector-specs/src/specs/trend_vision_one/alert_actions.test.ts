/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  API,
  httpError,
  ok,
  parseInput,
  request,
  resetMocksAroundEachTest,
  run,
  sent,
  vendorError,
} from './test_helpers';

resetMocksAroundEachTest();

const alert = (id: string) => ({ id, status: 'Open', investigationStatus: 'New' });
const page = (ids: string[], nextLink?: string) =>
  ok({ totalCount: 25, count: ids.length, items: ids.map(alert), nextLink });
/** Alert ids WB-<from> to WB-<to>. */
const ids = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `WB-${from + i}`);
const idsOf = (result: Record<string, unknown>) =>
  (result.items as Array<{ id: string }>).map(({ id }) => id);

describe('TrendAI Vision One listAlerts', () => {
  it('sends the time window as query params and the filters as one TMV1-Filter header', async () => {
    request.mockResolvedValueOnce(page(['WB-1']));
    const result = await run('listAlerts', {
      startDateTime: '2026-11-01T00:00:00Z',
      endDateTime: '2026-11-20T00:00:00Z',
      dateTimeTarget: 'updatedDateTime',
      status: 'In Progress',
      investigationResult: 'True Positive',
      severity: 'high',
      orderBy: 'createdDateTime asc',
    });
    expect(sent()).toMatchObject({
      method: 'GET',
      url: `${API}/workbench/alerts`,
      params: {
        startDateTime: '2026-11-01T00:00:00Z',
        endDateTime: '2026-11-20T00:00:00Z',
        dateTimeTarget: 'updatedDateTime',
        orderBy: 'createdDateTime asc',
      },
      headers: {
        'TMV1-Filter':
          "status eq 'In Progress' and investigationResult eq 'True Positive' and severity eq 'high'",
      },
    });
    expect(result).toEqual({
      totalCount: 25,
      count: 1,
      items: [{ id: 'WB-1', status: 'Open' }],
      nextLink: null,
      nextLinkRepeats: 0,
      pagesRead: 1,
    });
  });

  it('follows nextLink pages until maxResults is reached and re-sends the filter', async () => {
    const link2 = `${API}/workbench/alerts?skipToken=p2`;
    const link3 = `${API}/workbench/alerts?skipToken=p3`;
    request
      .mockResolvedValueOnce(page(ids(1, 10), link2))
      .mockResolvedValueOnce(page(ids(11, 20), link3));
    const result = (await run('listAlerts', { status: 'Open', maxResults: 20 })) as Record<
      string,
      unknown
    >;
    expect(request).toHaveBeenCalledTimes(2);
    expect(sent(1)).toMatchObject({
      url: link2,
      params: undefined,
      headers: { 'TMV1-Filter': "status eq 'Open'" },
    });
    expect(result).toMatchObject({ count: 20, pagesRead: 2, nextLink: link3, nextLinkRepeats: 0 });
    expect(idsOf(result)).toEqual(ids(1, 20));
  });

  it('returns the vendor nextLink when the last page fills maxResults exactly', async () => {
    const link2 = `${API}/workbench/alerts?skipToken=p2`;
    const link3 = `${API}/workbench/alerts?skipToken=p3`;
    request
      .mockResolvedValueOnce(page(ids(1, 10), link2))
      .mockResolvedValueOnce(page(ids(11, 20), link3));
    const result = (await run('listAlerts', { maxResults: 20 })) as Record<string, unknown>;
    expect(result).toMatchObject({ count: 20, pagesRead: 2, nextLink: link3, nextLinkRepeats: 0 });
  });

  it('cuts a first page larger than maxResults and links back to that page with its query', async () => {
    request.mockResolvedValueOnce(page(ids(1, 14), `${API}/workbench/alerts?skipToken=p2`));
    const result = (await run('listAlerts', {
      startDateTime: '2026-11-01T00:00:00Z',
      maxResults: 10,
    })) as Record<string, unknown>;
    expect(request).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      count: 10,
      pagesRead: 1,
      nextLink: `${API}/workbench/alerts?startDateTime=2026-11-01T00%3A00%3A00Z`,
      nextLinkRepeats: 10,
    });
    expect(result.items).toHaveLength(10);
  });

  it('moves forward on every call that follows the returned nextLink with the same maxResults', async () => {
    const link2 = `${API}/workbench/alerts?skipToken=p2`;
    const link3 = `${API}/workbench/alerts?skipToken=p3`;
    const pages: Record<string, ReturnType<typeof page>> = {
      [`${API}/workbench/alerts`]: page(ids(1, 10), link2),
      [link2]: page(ids(11, 20), link3),
      [link3]: page(ids(21, 30)),
    };
    request.mockImplementation(async ({ url }: { url: string }) => pages[url]);

    const first = (await run('listAlerts', { maxResults: 20 })) as Record<string, unknown>;
    expect(first).toMatchObject({ count: 20, nextLink: link3, nextLinkRepeats: 0 });
    const second = (await run('listAlerts', {
      nextLink: first.nextLink as string,
      maxResults: 20,
    })) as Record<string, unknown>;
    expect(second).toMatchObject({ count: 10, nextLink: null, nextLinkRepeats: 0 });

    // A page is never cut, so no call repeats an alert of the previous one.
    const newFirst = idsOf(first);
    const newSecond = idsOf(second).slice(first.nextLinkRepeats as number);
    expect(newFirst).toEqual(ids(1, 20));
    expect(newSecond).toEqual(ids(21, 30));
    const union = [...newFirst, ...newSecond];
    expect(new Set(union).size).toBe(union.length);
    expect(union).toEqual(ids(1, 30));
  });

  it('stops when the product repeats a nextLink and returns no nextLink to continue from', async () => {
    const link = `${API}/workbench/alerts?skipToken=same`;
    request.mockResolvedValue(page(['WB-1'], link));
    const result = (await run('listAlerts', { maxResults: 200 })) as Record<string, unknown>;
    expect(request).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ pagesRead: 2, nextLink: null });
  });

  it('stops after one page when the product links back to the first page', async () => {
    request.mockResolvedValue(
      page(['WB-1'], `${API}/workbench/alerts?startDateTime=2026-11-01T00%3A00%3A00Z`)
    );
    const result = (await run('listAlerts', {
      startDateTime: '2026-11-01T00:00:00Z',
      maxResults: 200,
    })) as Record<string, unknown>;
    expect(request).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ pagesRead: 1, count: 1, nextLink: null });
  });

  it('stops after one page when the product answers the caller nextLink with the same cursor', async () => {
    const link = `${API}/workbench/alerts?skipToken=p2&top=10`;
    request.mockResolvedValue(page(['WB-11'], link));
    const result = (await run('listAlerts', { nextLink: link, maxResults: 200 })) as Record<
      string,
      unknown
    >;
    expect(request).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ pagesRead: 1, nextLink: null });
  });

  it('compares links in a normalised form: a relative link or reordered query is the same cursor', async () => {
    request
      .mockResolvedValueOnce(page(['WB-1'], `${API}/workbench/alerts?skipToken=p2&top=10`))
      .mockResolvedValueOnce(page(['WB-2'], '/v3.0/workbench/alerts?top=10&skipToken=p2#x'));
    const result = (await run('listAlerts', { maxResults: 200 })) as Record<string, unknown>;
    expect(request).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ pagesRead: 2, count: 2, nextLink: null });
  });

  it('stops without a request when the product returns a nextLink on another host', async () => {
    const link = 'https://evil.example/v3.0/workbench/alerts?skipToken=p2';
    request.mockResolvedValueOnce(page(['WB-1'], link));
    const result = (await run('listAlerts', {})) as Record<string, unknown>;
    expect(request).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ pagesRead: 1, nextLink: link });
  });

  it('reads at most 20 pages', async () => {
    let n = 0;
    request.mockImplementation(async () =>
      page(['WB-x'], `${API}/workbench/alerts?skipToken=${++n}`)
    );
    const result = (await run('listAlerts', { maxResults: 200 })) as Record<string, unknown>;
    expect(request).toHaveBeenCalledTimes(20);
    expect(result).toMatchObject({ pagesRead: 20, count: 20 });
  });

  it('refuses a caller nextLink on another host before any request', async () => {
    await expect(
      run('listAlerts', { nextLink: '//evil.example/v3.0/workbench/alerts?skipToken=1' })
    ).rejects.toThrow('nextLink must point to');
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    [{ orderBy: 'investigationStatus desc' }, 'sortable alert fields'],
    [{ orderBy: 'severity descending' }, ''],
    [{ startDateTime: '2026-11-01' }, 'ISO 8601 UTC'],
    [{ maxResults: 201 }, ''],
    [{ maxResults: 0 }, ''],
    [{ status: 'open' }, ''],
    [{ severity: 'High' }, ''],
  ])('rejects %j at the schema', (input, message) => {
    const parsed = parseInput('listAlerts', input);
    expect(parsed.success).toBe(false);
    if (message) expect(JSON.stringify(parsed.error)).toContain(message);
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])(
    'rejects maxResults %i, below the page size of 10, at the schema',
    (maxResults) => {
      expect(parseInput('listAlerts', { maxResults }).success).toBe(false);
    }
  );

  it.each([10, 20, 50, 200])('accepts maxResults %i at the schema', (maxResults) => {
    expect(parseInput('listAlerts', { maxResults }).success).toBe(true);
  });

  it.each([11, 15, 25, 199])(
    'rejects maxResults %i, not a multiple of the page size of 10, at the schema',
    (maxResults) => {
      const parsed = parseInput('listAlerts', { maxResults });
      expect(parsed.success).toBe(false);
      expect(JSON.stringify(parsed.error)).toContain('maxResults must be a multiple of 10');
    }
  );

  it.each([
    ['2026-02-31T25:61:61Z'],
    ['2026-02-31T00:00:00Z'],
    ['2026-02-29T00:00:00Z'],
    ['2026-04-31T00:00:00Z'],
    ['2026-13-01T00:00:00Z'],
    ['2026-00-10T00:00:00Z'],
    ['2026-01-00T00:00:00Z'],
    ['2026-01-32T00:00:00Z'],
    ['2026-01-01T24:00:00Z'],
    ['2026-01-01T00:60:00Z'],
    ['2026-01-01T00:00:60Z'],
  ])('rejects the impossible date-time %s at the schema', (value) => {
    for (const field of ['startDateTime', 'endDateTime']) {
      const parsed = parseInput('listAlerts', { [field]: value });
      expect(parsed.success).toBe(false);
      expect(JSON.stringify(parsed.error)).toContain('Use a real date and time');
    }
  });

  it.each([
    ['2026-02-28T23:59:59Z'],
    ['2024-02-29T00:00:00Z'],
    ['2000-02-29T12:30:45Z'],
    ['2026-12-31T00:00:00Z'],
    ['2026-01-01T00:00:00Z'],
    ['2026-04-30T23:00:59Z'],
  ])('accepts the valid edge date-time %s at the schema', (value) => {
    expect(parseInput('listAlerts', { startDateTime: value, endDateTime: value }).success).toBe(
      true
    );
  });
});

describe('TrendAI Vision One getAlertDetails', () => {
  it('returns the alert without investigationStatus and with its etag', async () => {
    request.mockResolvedValueOnce(
      ok({ ...alert('WB-14-20190709-00003'), score: 64 }, { etag: '"33a64df5"' })
    );
    await expect(run('getAlertDetails', { id: 'WB-14-20190709-00003' })).resolves.toEqual({
      id: 'WB-14-20190709-00003',
      status: 'Open',
      score: 64,
      etag: '"33a64df5"',
    });
    expect(sent().url).toBe(`${API}/workbench/alerts/WB-14-20190709-00003`);
  });

  it('fails with a not found message for an unknown alert', async () => {
    request.mockRejectedValueOnce(httpError(404, vendorError('NotFound', 'Alert not found')));
    await expect(run('getAlertDetails', { id: 'WB-0' })).rejects.toThrow(
      'Workbench alert WB-0 not found'
    );
  });

  it('rejects ids with path characters', () => {
    expect(parseInput('getAlertDetails', { id: '../tasks/1' }).success).toBe(false);
  });
});

describe('TrendAI Vision One updateAlertStatus', () => {
  it('reads the ETag, sends it as If-Match and sends only the given fields', async () => {
    request
      .mockResolvedValueOnce(ok(alert('WB-1'), { etag: '"e1"' }))
      .mockResolvedValueOnce(ok(undefined, {}, 204));
    const result = await run('updateAlertStatus', {
      id: 'WB-1',
      status: 'Closed',
      investigationResult: 'False Positive',
    });
    expect(sent(1)).toMatchObject({
      method: 'PATCH',
      url: `${API}/workbench/alerts/WB-1`,
      data: { status: 'Closed', investigationResult: 'False Positive' },
      headers: { 'If-Match': '"e1"' },
    });
    expect(sent(1).data).not.toHaveProperty('investigationStatus');
    expect(result).toEqual({
      id: 'WB-1',
      updated: true,
      outcome: 'updated',
      status: 'Closed',
      investigationResult: 'False Positive',
    });
  });

  it('skips the update when the alert already has the requested values', async () => {
    request.mockResolvedValueOnce(
      ok({ id: 'WB-1', status: 'Closed', investigationResult: 'True Positive' }, { etag: '"e1"' })
    );
    const result = await run('updateAlertStatus', {
      id: 'WB-1',
      status: 'Closed',
      investigationResult: 'True Positive',
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ updated: false, outcome: 'skipped' });
  });

  it('uses the given etag without reading the alert', async () => {
    request.mockResolvedValueOnce(ok(undefined, {}, 204));
    await run('updateAlertStatus', { id: 'WB-1', status: 'In Progress', etag: '"e9"' });
    expect(request).toHaveBeenCalledTimes(1);
    expect(sent()).toMatchObject({
      method: 'PATCH',
      data: { status: 'In Progress' },
      headers: { 'If-Match': '"e9"' },
    });
  });

  it('reports a changed alert (412) without retrying', async () => {
    request.mockRejectedValueOnce(httpError(412, vendorError('ConditionNotMet', 'ETag mismatch')));
    await expect(
      run('updateAlertStatus', { id: 'WB-1', status: 'Closed', etag: '"old"' })
    ).rejects.toThrow('the alert changed since it was read');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('fails for an unknown alert before any update', async () => {
    request.mockRejectedValueOnce(httpError(404, vendorError('NotFound', 'Alert not found')));
    await expect(run('updateAlertStatus', { id: 'WB-404', status: 'Closed' })).rejects.toThrow(
      'not found'
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each(['', '   '])('rejects the blank etag %j at the schema', (etag) => {
    const parsed = parseInput('updateAlertStatus', { id: 'WB-1', status: 'Closed', etag });
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error)).toContain('etag must not be blank');
  });

  it('fails before any change when the alert is read without an ETag', async () => {
    request.mockResolvedValueOnce(ok(alert('WB-1'), {}));
    await expect(run('updateAlertStatus', { id: 'WB-1', status: 'Closed' })).rejects.toThrow(
      'TrendAI Vision One updateAlertStatus stopped: Workbench alert WB-1 was read without an ETag, so the update was not sent'
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls.map(([config]) => config.method)).toEqual(['GET']);
  });

  it('still skips an alert that already has the requested values when it is read without an ETag', async () => {
    request.mockResolvedValueOnce(ok({ id: 'WB-1', status: 'Closed' }, {}));
    await expect(run('updateAlertStatus', { id: 'WB-1', status: 'Closed' })).resolves.toEqual({
      id: 'WB-1',
      updated: false,
      outcome: 'skipped',
      status: 'Closed',
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('requires status or investigationResult', () => {
    expect(parseInput('updateAlertStatus', { id: 'WB-1' }).success).toBe(false);
    expect(
      parseInput('updateAlertStatus', { id: 'WB-1', investigationStatus: 'New' }).success
    ).toBe(false);
  });
});

describe('TrendAI Vision One addAlertNote', () => {
  it.each([
    ['%E0%A4%A', null],
    ['%', null],
    ['n%2D7', 'n-7'],
    ['note_7', 'note_7'],
    ['2035567', '2035567'],
    ['a.b~c', 'a.b~c'],
  ])(
    'reads the note id %s from Location without failing a successful write',
    async (segment, noteId) => {
      request.mockResolvedValueOnce(
        ok(undefined, { location: `${API}/workbench/alerts/WB-1/notes/${segment}` }, 201)
      );
      await expect(
        run('addAlertNote', { alertId: 'WB-1', content: 'Checked by SOC' })
      ).resolves.toEqual({ alertId: 'WB-1', noteId });
      expect(request).toHaveBeenCalledTimes(1);
    }
  );

  it('posts the note and returns the note id from Location', async () => {
    request.mockResolvedValueOnce(
      ok(undefined, { location: `${API}/workbench/alerts/WB-1/notes/7` }, 201)
    );
    await expect(
      run('addAlertNote', { alertId: 'WB-1', content: 'Checked by SOC' })
    ).resolves.toEqual({
      alertId: 'WB-1',
      noteId: '7',
    });
    expect(sent()).toMatchObject({
      method: 'POST',
      url: `${API}/workbench/alerts/WB-1/notes`,
      data: { content: 'Checked by SOC' },
    });
  });

  it('accepts 500000 characters and rejects one more', () => {
    expect(
      parseInput('addAlertNote', { alertId: 'WB-1', content: 'a'.repeat(500000) }).success
    ).toBe(true);
    expect(
      parseInput('addAlertNote', { alertId: 'WB-1', content: 'a'.repeat(500001) }).success
    ).toBe(false);
  });
});

describe('TrendAI Vision One listAlerts time budget', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-11-20T00:00:00Z') });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the pages read and the nextLink of the next page when under 10 s of the budget is left', async () => {
    const link2 = `${API}/workbench/alerts?skipToken=p2`;
    request.mockImplementationOnce(async () => {
      jest.advanceTimersByTime(91_000);
      return page(['WB-1', 'WB-2'], link2);
    });
    const result = (await run('listAlerts', { maxResults: 50 })) as Record<string, unknown>;
    expect(request).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ count: 2, pagesRead: 1, nextLink: link2, nextLinkRepeats: 0 });
  });

  it('starts a fresh budget for every action run', async () => {
    request.mockResolvedValue(page(['WB-1']));
    await run('listAlerts', {});
    jest.advanceTimersByTime(150_000);
    await expect(run('listAlerts', {})).resolves.toMatchObject({ count: 1 });
    expect(request).toHaveBeenCalledTimes(2);
  });
});

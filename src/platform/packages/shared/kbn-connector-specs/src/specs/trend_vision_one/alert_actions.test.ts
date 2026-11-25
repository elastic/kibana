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
import { REQUEST_TIMEOUT_MS, UPDATE_ALERT_DEADLINE_MS } from './constants';

resetMocksAroundEachTest();

const alert = (id: string) => ({ id, status: 'Open', investigationStatus: 'New' });
const page = (ids: string[], nextLink?: string) =>
  ok({ totalCount: 25, count: ids.length, items: ids.map(alert), nextLink });

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
    });
  });

  it('returns no nextLink when the product links back to the first page', async () => {
    request.mockResolvedValue(
      page(['WB-1'], `${API}/workbench/alerts?startDateTime=2026-11-01T00%3A00%3A00Z`)
    );
    const result = (await run('listAlerts', {
      startDateTime: '2026-11-01T00:00:00Z',
    })) as Record<string, unknown>;
    expect(request).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ count: 1, nextLink: null });
  });

  it('returns no nextLink when the product answers the caller nextLink with the same cursor', async () => {
    const link = `${API}/workbench/alerts?skipToken=p2&top=10`;
    request.mockResolvedValue(page(['WB-11'], link));
    const result = (await run('listAlerts', { nextLink: link })) as Record<string, unknown>;
    expect(request).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ nextLink: null });
  });

  it('stops without a request when the product returns a nextLink on another host', async () => {
    const link = 'https://evil.example/v3.0/workbench/alerts?skipToken=p2';
    request.mockResolvedValueOnce(page(['WB-1'], link));
    const result = (await run('listAlerts', {})) as Record<string, unknown>;
    expect(request).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ nextLink: link });
  });

  it('reads one page per call, returns its nextLink and maps the alerts', async () => {
    const link2 = `${API}/workbench/alerts?skipToken=p2`;
    request.mockResolvedValueOnce(page(['WB-1', 'WB-2'], link2));
    const result = await run('listAlerts', { status: 'Open' });
    expect(request).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      totalCount: 25,
      count: 2,
      items: [
        { id: 'WB-1', status: 'Open' },
        { id: 'WB-2', status: 'Open' },
      ],
      nextLink: link2,
    });
  });

  it('reads the next page from the returned nextLink with one request and the same filter', async () => {
    const link2 = `${API}/workbench/alerts?skipToken=p2`;
    request.mockResolvedValueOnce(page(['WB-11'], `${API}/workbench/alerts?skipToken=p3`));
    await run('listAlerts', { status: 'Open', nextLink: link2 });
    expect(request).toHaveBeenCalledTimes(1);
    expect(sent()).toMatchObject({
      url: link2,
      params: undefined,
      headers: { 'TMV1-Filter': "status eq 'Open'" },
    });
  });

  it('has no pagesRead, nextLinkRepeats or maxResults', async () => {
    request.mockResolvedValueOnce(page(['WB-1'], `${API}/workbench/alerts?skipToken=p2`));
    const result = (await run('listAlerts', { maxResults: 200 })) as Record<string, unknown>;
    expect(Object.keys(result).sort()).toEqual(['count', 'items', 'nextLink', 'totalCount']);
    expect(request).toHaveBeenCalledTimes(1);
    expect('maxResults' in (parseInput('listAlerts', {}).data as object)).toBe(false);
  });

  it('returns no nextLink when the product repeats a reordered or relative form of the read link', async () => {
    const link = `${API}/workbench/alerts?skipToken=p2&top=10`;
    request.mockResolvedValueOnce(page(['WB-11'], '/v3.0/workbench/alerts?top=10&skipToken=p2#x'));
    await expect(run('listAlerts', { nextLink: link })).resolves.toMatchObject({ nextLink: null });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['another path', `${API}/response/tasks?skipToken=1`],
    [
      'a link with a user name',
      'https://u:p@api.in.xdr.trendmicro.com/v3.0/workbench/alerts?skipToken=1',
    ],
  ])('refuses a caller nextLink with %s before any request', async (_what, nextLink) => {
    await expect(run('listAlerts', { nextLink })).rejects.toThrow('nextLink');
    expect(request).not.toHaveBeenCalled();
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
    [{ status: 'open' }, ''],
    [{ severity: 'High' }, ''],
  ])('rejects %j at the schema', (input, message) => {
    const parsed = parseInput('listAlerts', input);
    expect(parsed.success).toBe(false);
    if (message) expect(JSON.stringify(parsed.error)).toContain(message);
  });

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

  it('sends the lookup with the normal timeout and the PATCH with the time left of one shared deadline', async () => {
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValueOnce(1_000_000).mockReturnValueOnce(1_000_000 + 50_000);
    request
      .mockResolvedValueOnce(ok(alert('WB-1'), { etag: '"e1"' }))
      .mockResolvedValueOnce(ok(undefined, {}, 204));
    await run('updateAlertStatus', { id: 'WB-1', status: 'Closed' });
    expect(sent(0)).toMatchObject({ method: 'GET', timeout: REQUEST_TIMEOUT_MS });
    expect(sent(1)).toMatchObject({ method: 'PATCH', timeout: UPDATE_ALERT_DEADLINE_MS - 50_000 });
    expect(UPDATE_ALERT_DEADLINE_MS).toBeLessThan(120_000);
    now.mockRestore();
  });

  it('gives the PATCH its full timeout when the lookup was quick, and never more than REQUEST_TIMEOUT_MS', async () => {
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValueOnce(1_000_000).mockReturnValueOnce(1_000_000 + 200);
    request
      .mockResolvedValueOnce(ok(alert('WB-1'), { etag: '"e1"' }))
      .mockResolvedValueOnce(ok(undefined, {}, 204));
    await run('updateAlertStatus', { id: 'WB-1', status: 'Closed' });
    expect(sent(1)).toMatchObject({ method: 'PATCH', timeout: REQUEST_TIMEOUT_MS });
    now.mockRestore();
  });

  it('sends the PATCH with the full timeout when the etag is given (no lookup)', async () => {
    request.mockResolvedValueOnce(ok(undefined, {}, 204));
    await run('updateAlertStatus', { id: 'WB-1', status: 'Closed', etag: '"e9"' });
    expect(sent(0)).toMatchObject({ method: 'PATCH', timeout: REQUEST_TIMEOUT_MS });
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

  it.each([
    ['note_7#details', 'note_7'],
    ['note_7?x=1', 'note_7'],
    ['note_7?x=1#details', 'note_7'],
    ['a%23b', 'a#b'],
    ['a%23b#frag', 'a#b'],
    ['2035567', '2035567'],
  ])('takes the note id from the pathname of Location: %s gives %s', async (tail, noteId) => {
    request.mockResolvedValueOnce(
      ok(undefined, { location: `${API}/workbench/alerts/WB-1/notes/${tail}` }, 201)
    );
    await expect(
      run('addAlertNote', { alertId: 'WB-1', content: 'Checked by SOC' })
    ).resolves.toEqual({ alertId: 'WB-1', noteId });
  });

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { timers } from './client';
import { SentinelOne } from './sentinelone';

const CONSOLE = 'https://tenant.sentinelone.net';
const API = `${CONSOLE}/web/api/v2.1`;
const TOKEN = 'unit-test-token';
const AUTH = { Authorization: `ApiToken ${TOKEN}`, token: false };
const VENDOR = 'Ubuntu Developers &lt;ubuntu-devel-discuss@lists.ubuntu.com&gt;';

const request = jest.fn();
const ctx = {
  client: { request },
  config: { url: CONSOLE },
  secrets: { authType: 'api_key_header', token: TOKEN },
  log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
} as unknown as ActionContext;

const action = () => SentinelOne.actions.getApplicationCves;
const run = (input: Record<string, unknown>) => action().handler(ctx, action().input.parse(input));

/** Builds objects whose keys are SentinelOne filter names such as publishedDate__gte. */
const vendorParams = (entries: Array<[string, unknown]>) => Object.fromEntries(entries);

const httpError = (status: number, data: unknown = {}, headers: Record<string, string> = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, statusText: '', data, headers },
  });

/**
 * First page of the live probe (tests/final/replacement_probe/cve_hb_page1.json: handlebars, limit 4,
 * totalItems 10). The probe kept one record per call, so the four records are the distinct real
 * records it saw for this application, including CVE-2026-106445 whose severity is null (the
 * descriptions are cut to their first sentence).
 */
const NEXT_CURSOR =
  'eyJpZF9jb2x1bW4iOiAiQ1ZFVmlldy5jdmVfaWQiLCAiaWRfdmFsdWUiOiAiQ1ZFLTIwMjYtMTA2NDQ2IiwgImlkX3NvcnRfb3JkZXIiOiAiYXNjIiwgInNvcnRfYnlfY29sdW1uIjogIkNWRVZpZXcuY3ZlX2lkIiwgInNvcnRfYnlfdmFsdWUiOiAiQ1ZFLTIwMjYtMTA2NDQ2IiwgInNvcnRfb3JkZXIiOiAiYXNjIn0%3D';
const NEXT_CURSOR_2 =
  'eyJpZF9jb2x1bW4iOiAiQ1ZFVmlldy5jdmVfaWQiLCAiaWRfdmFsdWUiOiAiQ1ZFLTIwMjYtMzM5MzkiLCAiaWRfc29ydF9vcmRlciI6ICJhc2MiLCAic29ydF9ieV9jb2x1bW4iOiAiQ1ZFVmlldy5jdmVfaWQiLCAic29ydF9ieV92YWx1ZSI6ICJDVkUtMjAyNi0zMzkzOSIsICJzb3J0X29yZGVyIjogImFzYyJ9';
const cve = (
  cveId: string,
  cvssVersion: string,
  nvdBaseScore: string | null,
  publishedDate: string,
  severity: string | null,
  description: string
) => ({
  cveId,
  cvssVersion,
  description,
  fpFnMarks: null,
  mitreUrl: `https://www.cve.org/CVERecord?id=${cveId}`,
  nvdBaseScore,
  nvdUrl: `https://nvd.nist.gov/vuln/detail/${cveId}`,
  publishedDate,
  severity,
});
const PAGE_1 = {
  data: [
    cve(
      'CVE-2021-23383',
      '3.1',
      '9.80',
      '2021-05-04T09:15:00Z',
      'CRITICAL',
      'The package handlebars before 4.7.7 are vulnerable to Prototype Pollution when selecting certain compiling options to compile templates coming from an untrusted source.'
    ),
    cve(
      'CVE-2026-106444',
      '3.1',
      '4.70',
      '2026-10-06T19:40:01Z',
      'MEDIUM',
      'Handlebars provides the power necessary to let users build semantic templates.'
    ),
    cve(
      'CVE-2026-106445',
      '',
      null,
      '2026-10-06T20:10:39Z',
      null,
      'Handlebars provides the power necessary to let users build semantic templates.'
    ),
    cve(
      'CVE-2026-33937',
      '3.1',
      '9.80',
      '2026-03-27T21:17:27Z',
      'CRITICAL',
      'Handlebars provides the power necessary to let users build semantic templates.'
    ),
  ],
  pagination: { nextCursor: NEXT_CURSOR, totalItems: 10 },
};

beforeEach(() => {
  request.mockReset();
  jest.spyOn(timers, 'sleep').mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getApplicationCves', () => {
  it('is a read-only tool whose description carries the input rule', () => {
    expect(action().isTool).toBe(true);
    expect(action().scope).toBe('read');
    for (const text of [
      'applicationIds',
      'applicationName + applicationVendor + applicationVersions',
      'HTML-escaped',
      'Application Risk inventory',
      'reliable only on the first page',
      'severity and nvdBaseScore can be null',
      'Ranger Insights',
    ]) {
      expect(action().description).toContain(text);
    }
  });

  it('maps every input to the vendor query string and normalizes the real first page', async () => {
    request.mockResolvedValue({ status: 200, data: PAGE_1 });
    const result = await run({
      applicationIds: ['2511613665095786099'],
      cveIdContains: ['CVE-2026', '2021-23'],
      severities: ['CRITICAL', 'MEDIUM'],
      analystVerdict: ['Default', 'False Positive'],
      publishedDateGte: '2021-01-01T00:00:00Z',
      publishedDateLte: '2026-12-31T00:00:00Z',
      publishedDateGt: '2020-01-01T00:00:00Z',
      publishedDateLt: '2027-01-01T00:00:00Z',
      publishedDateBetween: '1609459200000-1640995200000',
      siteIds: ['21', '22'],
      sortBy: 'nvdBaseScore',
      sortOrder: 'desc',
      limit: 4,
      skip: 0,
      skipCount: false,
    });

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: `${API}/application-management/risks/cves`,
        headers: AUTH,
        params: vendorParams([
          ['applicationIds', '2511613665095786099'],
          ['cveId__contains', 'CVE-2026,2021-23'],
          ['severities', 'CRITICAL,MEDIUM'],
          ['analystVerdict', 'Default,False Positive'],
          ['publishedDate__gte', '2021-01-01T00:00:00Z'],
          ['publishedDate__lte', '2026-12-31T00:00:00Z'],
          ['siteIds', '21,22'],
          ['sortBy', 'nvdBaseScore'],
          ['sortOrder', 'desc'],
          ['limit', 4],
          ['skip', 0],
          ['skipCount', false],
          ['publishedDate__gt', '2020-01-01T00:00:00Z'],
          ['publishedDate__lt', '2027-01-01T00:00:00Z'],
          ['publishedDate__between', '1609459200000-1640995200000'],
        ]),
      })
    );
    expect(result).toEqual({
      data: PAGE_1.data,
      pagination: { nextCursor: NEXT_CURSOR, totalItems: 10 },
      errors: null,
    });
    const nullSeverity = (
      result as { data: Array<{ cveId: string; severity: unknown }> }
    ).data.find((item) => item.cveId === 'CVE-2026-106445');
    expect(nullSeverity?.severity).toBeNull();
  });

  it('chains pages by name + vendor + versions (vendor sent HTML-escaped as given) and passes counts and empty answers through', async () => {
    const target = {
      applicationName: 'handlebars',
      applicationVendor: VENDOR,
      applicationVersions: ['3:4.7.7+~4.1.0-1'],
    };
    const targetParams = {
      applicationName: 'handlebars',
      applicationVendor: VENDOR,
      applicationVersions: '3:4.7.7+~4.1.0-1',
    };
    // cve_hb_page2_cursor.json: a cursor page has totalItems 0 and the next cursor (one of its records kept)
    const page2Body = {
      data: [
        cve(
          'CVE-2026-33916',
          '3.1',
          '4.70',
          '2026-03-27T06:34:09Z',
          'MEDIUM',
          'Handlebars provides the power necessary to let users build semantic templates.'
        ),
      ],
      pagination: { nextCursor: NEXT_CURSOR_2, totalItems: 0 },
    };
    const lastPage = { data: [], pagination: { nextCursor: null, totalItems: 0 } };
    request
      .mockResolvedValueOnce({ status: 200, data: PAGE_1 })
      .mockResolvedValueOnce({ status: 200, data: page2Body })
      .mockResolvedValueOnce({ status: 200, data: lastPage })
      .mockResolvedValueOnce({
        status: 200,
        data: { data: [], pagination: { nextCursor: null, totalItems: 10 } },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { data: [], pagination: { nextCursor: null, totalItems: 0 } },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { data: [], pagination: { nextCursor: null, totalItems: 0 } },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: { data: [], errors: [{ code: 1, title: 'warning' }] },
      });

    // page 1 -> nextCursor -> page 2 (totalItems 0 passed through) -> last page (nextCursor null)
    const page1 = (await run({ ...target, limit: 4 })) as typeof PAGE_1;
    const page2 = (await run({ ...target, limit: 4, cursor: page1.pagination.nextCursor })) as {
      pagination: { nextCursor: string };
    };
    expect(page2).toEqual({ ...page2Body, errors: null });
    await expect(
      run({ ...target, limit: 4, cursor: page2.pagination.nextCursor })
    ).resolves.toEqual({ ...lastPage, errors: null });
    // countOnly: no records, totalItems only
    await expect(run({ ...target, countOnly: true })).resolves.toEqual({
      data: [],
      pagination: { nextCursor: null, totalItems: 10 },
      errors: null,
    });
    // skipCount: totalItems 0 passed through unchanged
    await expect(run({ ...target, skipCount: true })).resolves.toEqual(
      expect.objectContaining({ pagination: { nextCursor: null, totalItems: 0 } })
    );
    // empty 200 (an application id without CVEs)
    await expect(run({ applicationIds: ['2511613665095786099'] })).resolves.toEqual({
      data: [],
      pagination: { nextCursor: null, totalItems: 0 },
      errors: null,
    });
    // an errors array in a 200 is returned, never dropped; missing pagination becomes nulls
    await expect(run({ applicationIds: ['1'] })).resolves.toEqual({
      data: [],
      pagination: { nextCursor: null, totalItems: null },
      errors: [{ code: 1, title: 'warning' }],
    });

    expect(request.mock.calls.map(([config]) => config.params)).toEqual([
      { ...targetParams, limit: 4 },
      { ...targetParams, limit: 4, cursor: NEXT_CURSOR },
      { ...targetParams, limit: 4, cursor: NEXT_CURSOR_2 },
      { ...targetParams, countOnly: true },
      { ...targetParams, skipCount: true },
      { applicationIds: '2511613665095786099' },
      { applicationIds: '1' },
    ]);
  });

  it('rejects a call without exactly one targeting mode, and out-of-range paging, before any request', () => {
    const { input } = action();
    const rejected: Array<[Record<string, unknown>, string]> = [
      [{}, 'Target one application'],
      [{ limit: 10, siteIds: ['21'] }, 'Target one application'],
      [
        { applicationName: 'handlebars' },
        'applicationName and applicationVendor must be given together',
      ],
      [
        { applicationVendor: VENDOR },
        'applicationName and applicationVendor must be given together',
      ],
      [
        { applicationIds: ['1'], applicationName: 'handlebars', applicationVendor: VENDOR },
        'not both',
      ],
      [{ applicationIds: ['1'], applicationVersions: ['1.0'] }, 'applicationVersions applies only'],
      [{ applicationIds: [] }, 'Too small'],
      [{ applicationIds: ['1'], limit: 0 }, 'Too small'],
      [{ applicationIds: ['1'], limit: 1001 }, 'Too big'],
      [{ applicationIds: ['1'], skip: -1 }, 'Too small'],
      [{ applicationIds: ['1'], skip: 1001 }, 'Too big'],
      [{ applicationIds: ['1'], sortBy: 'nonsense' }, 'Invalid option'],
      [{ applicationIds: ['1,2'] }, 'Invalid string'],
      [{ applicationIds: ['1'], publishedDateBetween: '2021-01-01' }, 'Invalid string'],
    ];
    for (const [candidate, message] of rejected) {
      expect(() => input.parse(candidate)).toThrow(message);
    }
    expect(request).not.toHaveBeenCalled();

    expect(input.parse({ applicationName: 'handlebars', applicationVendor: VENDOR })).toEqual({
      applicationName: 'handlebars',
      applicationVendor: VENDOR,
    });
    for (const limit of [1, 1000]) {
      expect(() => input.parse({ applicationIds: ['1'], limit, skip: 1000 })).not.toThrow();
    }
    expect(() => input.parse({ applicationIds: ['1', '2'] })).not.toThrow();
  });

  it('passes the vendor 400, 401 and 403 through in the connector error format, without the token', async () => {
    const failure = async (input: Record<string, unknown>): Promise<string> => {
      const error = (await run(input).catch((err: Error) => err)) as Error;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).not.toContain(TOKEN);
      return error.message;
    };
    // tests/final/replacement_probe/cve_new_name_vendor.json
    request.mockRejectedValueOnce(
      httpError(400, {
        errors: [
          {
            code: 4000010,
            detail: 'Querying without applicationVersions is available with Ranger Insights.',
            title: 'Validation Error',
          },
        ],
      })
    );
    expect(
      await failure({
        applicationName: 'Microsoft OneDrive',
        applicationVendor: 'Microsoft Corporation',
      })
    ).toBe(
      'Status code: 400. Message: API Error [Bad Request] 4000010 Validation Error Querying without applicationVersions is available with Ranger Insights.'
    );

    // cve_new_multi_app.json
    request.mockRejectedValueOnce(
      httpError(400, {
        errors: [
          {
            code: 4000010,
            detail: 'Querying by multiple applicationIds is available with Ranger Insights.',
            title: 'Validation Error',
          },
        ],
      })
    );
    expect(await failure({ applicationIds: ['1', '2'] })).toContain(
      '4000010 Validation Error Querying by multiple applicationIds is available with Ranger Insights.'
    );

    // cve_new_wrong_token.json
    request.mockRejectedValueOnce(
      httpError(401, { errors: [{ code: 4010010, detail: null, title: 'Authentication Failed' }] })
    );
    expect(await failure({ applicationIds: ['2511613665095786099'] })).toBe(
      'Status code: 401. Message: Unauthorized API Error (401) 4010010 Authentication Failed. Check the API token and the tenant URL'
    );

    // 403 4030010 as seen on the sibling aggregated-applications route (Ranger Insights wording)
    request.mockRejectedValueOnce(
      httpError(403, {
        errors: [
          {
            code: 4030010,
            detail: 'This feature is available with Ranger Insights license',
            title: 'Insufficient permissions',
          },
        ],
      })
    );
    expect(await failure({ applicationIds: ['1'] })).toBe(
      'Status code: 403. Message: API Error [Forbidden] 4030010 Insufficient permissions This feature is available with Ranger Insights license. Grant the permission listed for this action'
    );
    // a 4xx answer is never retried
    expect(request).toHaveBeenCalledTimes(4);
  });

  it('retries a 429 like the other reads: Retry-After honored up to 30 s, at most 3 attempts', async () => {
    const sleep = jest.mocked(timers.sleep);
    request
      .mockRejectedValueOnce(httpError(429, {}, { 'retry-after': '120' }))
      .mockRejectedValueOnce(httpError(429, {}, { 'retry-after': '2' }))
      .mockResolvedValueOnce({ status: 200, data: PAGE_1 });
    await expect(run({ applicationIds: ['1'] })).resolves.toEqual(
      expect.objectContaining({ data: PAGE_1.data })
    );
    expect(sleep.mock.calls).toEqual([[30_000], [2_000]]);

    request.mockReset();
    sleep.mockClear();
    request.mockRejectedValue(httpError(429, {}, { 'retry-after': '1' }));
    await expect(run({ applicationIds: ['1'] })).rejects.toThrow(
      'SentinelOne rate limit reached for getApplicationCves; try again later'
    );
    expect(request).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});

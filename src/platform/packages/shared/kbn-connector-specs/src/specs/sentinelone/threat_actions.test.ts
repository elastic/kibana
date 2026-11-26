/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestCase } from './test_helpers';
import {
  CONSOLE,
  expectDocumentedRequest,
  httpError,
  request,
  resetMocksAroundEachTest,
  run,
} from './test_helpers';

resetMocksAroundEachTest();

/** One row per single-request action: input, then the exact request it must send. */
const REQUEST_CASES: RequestCase[] = [
  [
    'fetchThreatFile',
    { threatId: '31', password: 'Secret-Pass-123' },
    {
      method: 'POST',
      path: '/threats/fetch-file',
      data: { data: { password: 'Secret-Pass-123' }, filter: { ids: ['31'] } },
    },
  ],
  [
    'getThreats',
    {
      incidentStatuses: ['unresolved'],
      contentHashes: ['a'.repeat(40)],
      sortBy: 'createdAt',
      sortOrder: 'desc',
      cursor: 'c1',
    },
    {
      method: 'GET',
      path: '/threats',
      params: {
        incidentStatuses: 'unresolved',
        contentHashes: 'a'.repeat(40),
        sortBy: 'createdAt',
        sortOrder: 'desc',
        cursor: 'c1',
      },
    },
  ],
  [
    'getThreatDetails',
    { ids: ['31', '32'] },
    { method: 'GET', path: '/threats', params: { ids: '31,32', limit: 2 } },
  ],
  [
    'getThreatNotes',
    { threatId: '31', limit: 20 },
    { method: 'GET', path: '/threats/31/notes', params: { limit: 20 } },
  ],
  [
    'getThreatTimeline',
    { threatId: '31', query: 'kill' },
    { method: 'GET', path: '/threats/31/timeline', params: { query: 'kill' } },
  ],
  [
    'mitigateThreat',
    { action: 'quarantine', threatIds: ['31'] },
    { method: 'POST', path: '/threats/mitigate/quarantine', data: { filter: { ids: ['31'] } } },
  ],
  [
    'rollbackThreat',
    { threatIds: ['31'] },
    {
      method: 'POST',
      path: '/threats/mitigate/rollback-remediation',
      data: { filter: { ids: ['31'] } },
    },
  ],
  [
    'updateThreatVerdict',
    { threatIds: ['31'], analystVerdict: 'true_positive' },
    {
      method: 'POST',
      path: '/threats/analyst-verdict',
      data: { filter: { ids: ['31'] }, data: { analystVerdict: 'true_positive' } },
    },
  ],
  [
    'updateThreatStatus',
    { threatIds: ['31'], incidentStatus: 'resolved', analystVerdict: 'false_positive' },
    {
      method: 'POST',
      path: '/threats/incident',
      data: {
        filter: { ids: ['31'] },
        data: { incidentStatus: 'resolved', analystVerdict: 'false_positive' },
      },
    },
  ],
  [
    'addThreatNote',
    { threatIds: ['31'], text: 'Isolated after approval' },
    {
      method: 'POST',
      path: '/threats/notes',
      data: { filter: { ids: ['31'] }, data: { text: 'Isolated after approval' } },
    },
  ],
];

describe('request shapes', () => {
  it.each(REQUEST_CASES)('%s sends the documented request', expectDocumentedRequest);
});

describe('fetchThreatFile', () => {
  const fetchOne = () => run('fetchThreatFile', { threatId: '31', password: 'Secret-Pass-123' });

  it('sends the single threat and the password in the body only and never returns the password', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { data: { affected: 1 } } });
    const result = await fetchOne();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        method: 'POST',
        url: `${CONSOLE}/web/api/v2.1/threats/fetch-file`,
        data: { data: { password: 'Secret-Pass-123' }, filter: { ids: ['31'] } },
      })
    );
    expect(JSON.stringify(result)).not.toContain('Secret-Pass-123');
  });

  it('fails when SentinelOne reports that no threat was affected', async () => {
    request.mockResolvedValueOnce({ status: 200, data: { data: { affected: 0 } } });
    await expect(fetchOne()).rejects.toThrow(
      'SentinelOne did not apply fetchThreatFile to 31: SentinelOne reported 0 affected objects'
    );
  });

  it('does not put the password in the error of a rejected request', async () => {
    request.mockRejectedValueOnce(
      httpError(400, { errors: [{ code: 4000010, title: 'Invalid user input received' }] })
    );
    const error = await fetchOne().catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect(String((error as Error).message)).not.toContain('Secret-Pass-123');
  });
});

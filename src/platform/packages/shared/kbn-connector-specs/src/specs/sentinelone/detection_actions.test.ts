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
  API,
  expectDocumentedRequest,
  listBody,
  request,
  resetMocksAroundEachTest,
  run,
} from './test_helpers';

resetMocksAroundEachTest();

/** One row per single-request action: input, then the exact request it must send. */
const REQUEST_CASES: RequestCase[] = [
  [
    'searchAlerts',
    { severity: ['High'], incidentStatus: ['UNRESOLVED'] },
    {
      method: 'GET',
      path: '/cloud-detection/alerts',
      params: { severity: 'High', incidentStatus: 'UNRESOLVED' },
    },
  ],
  [
    'updateAlertVerdict',
    { alertIds: ['41'], analystVerdict: 'suspicious' },
    {
      method: 'POST',
      path: '/cloud-detection/alerts/analyst-verdict',
      data: { filter: { ids: ['41'] }, data: { analystVerdict: 'suspicious' } },
    },
  ],
  [
    'updateAlertStatus',
    { alertIds: ['41'], incidentStatus: 'in_progress' },
    {
      method: 'POST',
      path: '/cloud-detection/alerts/incident',
      data: { filter: { ids: ['41'] }, data: { incidentStatus: 'in_progress' } },
    },
  ],
  [
    'createStarRule',
    {
      name: 'Encoded PowerShell',
      severity: 'High',
      queryType: 'events',
      s1ql: 'src.process.cmdline contains "-enc"',
      siteIds: ['21'],
    },
    {
      method: 'POST',
      path: '/cloud-detection/rules',
      data: {
        data: {
          name: 'Encoded PowerShell',
          severity: 'High',
          queryType: 'events',
          s1ql: 'src.process.cmdline contains "-enc"',
          status: 'Draft',
          expirationMode: 'Permanent',
        },
        filter: { siteIds: ['21'] },
      },
    },
  ],
  [
    'enableStarRules',
    { ruleIds: ['51'] },
    { method: 'PUT', path: '/cloud-detection/rules/enable', data: { filter: { ids: ['51'] } } },
  ],
  [
    'disableStarRules',
    { ruleIds: ['51'] },
    { method: 'PUT', path: '/cloud-detection/rules/disable', data: { filter: { ids: ['51'] } } },
  ],
  [
    'deleteStarRule',
    { ruleIds: ['51'] },
    { method: 'DELETE', path: '/cloud-detection/rules', data: { filter: { ids: ['51'] } } },
  ],
];

describe('request shapes', () => {
  it.each(REQUEST_CASES)('%s sends the documented request', expectDocumentedRequest);
});

describe('updateStarRule', () => {
  it('reads the rule, sends the full merged definition with its scope and returns the previous one', async () => {
    const current = {
      id: '51',
      name: 'Old',
      severity: 'Low',
      status: 'Active',
      queryType: 'events',
      s1ql: 'a',
      expirationMode: 'Permanent',
      coolOffSettings: { renotifyMinutes: 60 },
      scope: 'site',
      scopeId: ['21'],
      createdAt: '2026-01-01T00:00:00Z',
    };
    request
      .mockResolvedValueOnce({ status: 200, data: listBody([current]) })
      .mockResolvedValueOnce({ status: 200, data: { data: { id: '51', severity: 'High' } } });
    const result = await run('updateStarRule', { ruleId: '51', severity: 'High' });
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        method: 'GET',
        url: `${API}/cloud-detection/rules`,
        params: { ids: '51', limit: 1 },
      })
    );
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        method: 'PUT',
        url: `${API}/cloud-detection/rules/51`,
        data: {
          data: {
            name: 'Old',
            severity: 'High',
            status: 'Active',
            queryType: 'events',
            s1ql: 'a',
            expirationMode: 'Permanent',
            coolOffSettings: { renotifyMinutes: 60 },
          },
          filter: { siteIds: ['21'] },
        },
      })
    );
    expect(result).toEqual(expect.objectContaining({ previous: current }));
  });

  it('sends expirationMode Permanent when the stored rule has none', async () => {
    const current = {
      id: '51',
      name: 'Old',
      severity: 'Low',
      status: 'Active',
      queryType: 'events',
      s1ql: 'a',
      scope: 'site',
      scopeId: ['21'],
    };
    request
      .mockResolvedValueOnce({ status: 200, data: listBody([current]) })
      .mockResolvedValueOnce({ status: 200, data: { data: { id: '51' } } });
    await run('updateStarRule', { ruleId: '51', severity: 'High' });
    expect(request.mock.calls[1][0].data.data).toEqual(
      expect.objectContaining({ expirationMode: 'Permanent', severity: 'High' })
    );
  });

  it('needs at least one field to change', async () => {
    await expect(run('updateStarRule', { ruleId: '51' })).rejects.toThrow('at least one field');
    expect(request).not.toHaveBeenCalled();
  });

  it('fails when the rule does not exist', async () => {
    request.mockResolvedValueOnce({ status: 200, data: listBody([]) });
    await expect(run('updateStarRule', { ruleId: '51', name: 'New' })).rejects.toThrow(
      'STAR rule [51] not found'
    );
  });
});

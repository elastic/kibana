/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of, Subject, throwError } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { SearchAlertsResult, searchAlerts, SearchAlertsParams } from './search_alerts';

const searchResponse = {
  id: '0',
  rawResponse: {
    took: 1,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: 2,
      max_score: 1,
      hits: [
        {
          _index: '.internal.alerts-security.alerts-default-000001',
          _id: '38dd308706a127696cc63b8f142e8e4d66f8f79bc7d491dd79a42ea4ead62dd1',
          _score: 1,
          fields: {
            'kibana.alert.severity': ['low'],
            'process.name': ['iexlorer.exe'],
            '@timestamp': ['2022-03-22T16:48:07.518Z'],
            'kibana.alert.risk_score': [21],
            'kibana.alert.rule.name': ['test'],
            'user.name': ['5qcxz8o4j7'],
            'kibana.alert.reason': [
              'registry event with process iexlorer.exe, by 5qcxz8o4j7 on Host-4dbzugdlqd created low alert test.',
            ],
            'host.name': ['Host-4dbzugdlqd'],
          },
        },
        {
          _index: '.internal.alerts-security.alerts-default-000001',
          _id: '8361363c0db6f30ca2dfb4aeb4835e7d6ec57bc195b96d9ee5a4ead1bb9f8b86',
          _score: 1,
          fields: {
            'kibana.alert.severity': ['low'],
            'process.name': ['iexlorer.exe'],
            '@timestamp': ['2022-03-22T16:17:50.769Z'],
            'kibana.alert.risk_score': [21],
            'kibana.alert.rule.name': ['test'],
            'user.name': ['hdgsmwj08h'],
            'kibana.alert.reason': [
              'network event with process iexlorer.exe, by hdgsmwj08h on Host-4dbzugdlqd created low alert test.',
            ],
            'host.name': ['Host-4dbzugdlqd'],
          },
        },
      ],
    },
  },
  isPartial: false,
  isRunning: false,
  total: 2,
  loaded: 2,
  isRestored: false,
};

const searchResponse$ = of<IKibanaSearchResponse>(searchResponse);

const expectedResponse: SearchAlertsResult = {
  total: -1,
  alerts: [],
  oldAlertsData: [],
  ecsAlertsData: [],
};

const parsedAlerts = {
  alerts: [
    {
      _index: '.internal.alerts-security.alerts-default-000001',
      _id: '38dd308706a127696cc63b8f142e8e4d66f8f79bc7d491dd79a42ea4ead62dd1',
      '@timestamp': ['2022-03-22T16:48:07.518Z'],
      'host.name': ['Host-4dbzugdlqd'],
      'kibana.alert.reason': [
        'registry event with process iexlorer.exe, by 5qcxz8o4j7 on Host-4dbzugdlqd created low alert test.',
      ],
      'kibana.alert.risk_score': [21],
      'kibana.alert.rule.name': ['test'],
      'kibana.alert.severity': ['low'],
      'process.name': ['iexlorer.exe'],
      'user.name': ['5qcxz8o4j7'],
    },
    {
      _index: '.internal.alerts-security.alerts-default-000001',
      _id: '8361363c0db6f30ca2dfb4aeb4835e7d6ec57bc195b96d9ee5a4ead1bb9f8b86',
      '@timestamp': ['2022-03-22T16:17:50.769Z'],
      'host.name': ['Host-4dbzugdlqd'],
      'kibana.alert.reason': [
        'network event with process iexlorer.exe, by hdgsmwj08h on Host-4dbzugdlqd created low alert test.',
      ],
      'kibana.alert.risk_score': [21],
      'kibana.alert.rule.name': ['test'],
      'kibana.alert.severity': ['low'],
      'process.name': ['iexlorer.exe'],
      'user.name': ['hdgsmwj08h'],
    },
  ],
  total: 2,
  ecsAlertsData: [
    {
      kibana: {
        alert: {
          severity: ['low'],
          risk_score: [21],
          rule: { name: ['test'] },
          reason: [
            'registry event with process iexlorer.exe, by 5qcxz8o4j7 on Host-4dbzugdlqd created low alert test.',
          ],
        },
      },
      process: { name: ['iexlorer.exe'] },
      '@timestamp': ['2022-03-22T16:48:07.518Z'],
      user: { name: ['5qcxz8o4j7'] },
      host: { name: ['Host-4dbzugdlqd'] },
      _id: '38dd308706a127696cc63b8f142e8e4d66f8f79bc7d491dd79a42ea4ead62dd1',
      _index: '.internal.alerts-security.alerts-default-000001',
    },
    {
      kibana: {
        alert: {
          severity: ['low'],
          risk_score: [21],
          rule: { name: ['test'] },
          reason: [
            'network event with process iexlorer.exe, by hdgsmwj08h on Host-4dbzugdlqd created low alert test.',
          ],
        },
      },
      process: { name: ['iexlorer.exe'] },
      '@timestamp': ['2022-03-22T16:17:50.769Z'],
      user: { name: ['hdgsmwj08h'] },
      host: { name: ['Host-4dbzugdlqd'] },
      _id: '8361363c0db6f30ca2dfb4aeb4835e7d6ec57bc195b96d9ee5a4ead1bb9f8b86',
      _index: '.internal.alerts-security.alerts-default-000001',
    },
  ],
  oldAlertsData: [
    [
      { field: 'kibana.alert.severity', value: ['low'] },
      { field: 'process.name', value: ['iexlorer.exe'] },
      { field: '@timestamp', value: ['2022-03-22T16:48:07.518Z'] },
      { field: 'kibana.alert.risk_score', value: [21] },
      { field: 'kibana.alert.rule.name', value: ['test'] },
      { field: 'user.name', value: ['5qcxz8o4j7'] },
      {
        field: 'kibana.alert.reason',
        value: [
          'registry event with process iexlorer.exe, by 5qcxz8o4j7 on Host-4dbzugdlqd created low alert test.',
        ],
      },
      { field: 'host.name', value: ['Host-4dbzugdlqd'] },
      {
        field: '_id',
        value: '38dd308706a127696cc63b8f142e8e4d66f8f79bc7d491dd79a42ea4ead62dd1',
      },
      { field: '_index', value: '.internal.alerts-security.alerts-default-000001' },
    ],
    [
      { field: 'kibana.alert.severity', value: ['low'] },
      { field: 'process.name', value: ['iexlorer.exe'] },
      { field: '@timestamp', value: ['2022-03-22T16:17:50.769Z'] },
      { field: 'kibana.alert.risk_score', value: [21] },
      { field: 'kibana.alert.rule.name', value: ['test'] },
      { field: 'user.name', value: ['hdgsmwj08h'] },
      {
        field: 'kibana.alert.reason',
        value: [
          'network event with process iexlorer.exe, by hdgsmwj08h on Host-4dbzugdlqd created low alert test.',
        ],
      },
      { field: 'host.name', value: ['Host-4dbzugdlqd'] },
      {
        field: '_id',
        value: '8361363c0db6f30ca2dfb4aeb4835e7d6ec57bc195b96d9ee5a4ead1bb9f8b86',
      },
      { field: '_index', value: '.internal.alerts-security.alerts-default-000001' },
    ],
  ],
};

describe('searchAlerts', () => {
  const mockDataPlugin = {
    search: {
      search: jest.fn().mockReturnValue(searchResponse$),
      showError: jest.fn(),
    },
  };

  const params: SearchAlertsParams = {
    data: mockDataPlugin as unknown as DataPublicPluginStart,
    ruleTypeIds: ['siem.esqlRule'],
    consumers: ['siem'],
    fields: [
      { field: 'kibana.rule.type.id', include_unmapped: true },
      { field: '*', include_unmapped: true },
    ],
    query: {
      ids: { values: ['alert-id-1'] },
    },
    pageIndex: 0,
    pageSize: 10,
    sort: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the response correctly', async () => {
    const result = await searchAlerts(params);

    expect(result).toEqual(
      expect.objectContaining({
        ...expectedResponse,
        ...parsedAlerts,
      })
    );
  });

  it('call search with correct arguments', async () => {
    await searchAlerts(params);
    expect(mockDataPlugin.search.search).toHaveBeenCalledTimes(1);
    expect(mockDataPlugin.search.search).toHaveBeenCalledWith(
      {
        ruleTypeIds: params.ruleTypeIds,
        consumers: params.consumers,
        fields: [...params.fields!],
        pagination: {
          pageIndex: params.pageIndex,
          pageSize: params.pageSize,
        },
        query: {
          ids: {
            values: ['alert-id-1'],
          },
        },
        sort: params.sort,
      },
      { strategy: 'privateRuleRegistryAlertsSearchStrategy' }
    );
  });

  it('handles search error', async () => {
    const obs$ = throwError('simulated search error');
    mockDataPlugin.search.search.mockReturnValue(obs$);
    const result = await searchAlerts(params);

    expect(result).toEqual(
      expect.objectContaining({
        ...expectedResponse,
        alerts: [],
        total: 0,
      })
    );

    expect(mockDataPlugin.search.showError).toHaveBeenCalled();
  });

  it("doesn't return while the response is still running", async () => {
    const response$ = new Subject<IKibanaSearchResponse>();
    mockDataPlugin.search.search.mockReturnValue(response$);
    let result: SearchAlertsResult | undefined;
    const done = searchAlerts(params).then((r) => {
      result = r;
    });
    response$.next({
      ...searchResponse,
      isRunning: true,
    });
    expect(result).toBeUndefined();
    response$.next({ ...searchResponse, isRunning: false });
    response$.complete();
    await done;
    expect(result).toEqual(
      expect.objectContaining({
        ...expectedResponse,
        ...parsedAlerts,
      })
    );
  });

  it('returns the correct total alerts if the total alerts in the response is an object', async () => {
    const obs$ = of<IKibanaSearchResponse>({
      ...searchResponse,
      rawResponse: {
        ...searchResponse.rawResponse,
        hits: { ...searchResponse.rawResponse.hits, total: { value: 2 } },
      },
    });

    mockDataPlugin.search.search.mockReturnValue(obs$);
    const result = await searchAlerts(params);

    expect(result.total).toEqual(2);
  });

  it('does not return an alert without fields', async () => {
    const obs$ = of<IKibanaSearchResponse>({
      ...searchResponse,
      rawResponse: {
        ...searchResponse.rawResponse,
        hits: {
          ...searchResponse.rawResponse.hits,
          hits: [
            {
              _index: '.internal.alerts-security.alerts-default-000001',
              _id: '38dd308706a127696cc63b8f142e8e4d66f8f79bc7d491dd79a42ea4ead62dd1',
              _score: 1,
            },
          ],
        },
      },
    });

    mockDataPlugin.search.search.mockReturnValue(obs$);
    const result = await searchAlerts(params);

    expect(result.alerts).toEqual([]);
  });
});

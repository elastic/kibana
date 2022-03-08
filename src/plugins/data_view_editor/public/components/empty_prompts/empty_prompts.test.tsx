/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isUserDataIndex } from './empty_prompts';
import { MatchedItem, ResolveIndexResponseItemIndexAttrs } from '../../types';

describe('isUserDataIndex', () => {
  test('system index is not data index', () => {
    const systemIndexes: MatchedItem[] = [
      {
        name: '.apm-agent-configuration',
        tags: [
          {
            key: 'index',
            name: 'Index',
            color: 'default',
          },
        ],
        item: {
          name: '.apm-agent-configuration',
          attributes: [ResolveIndexResponseItemIndexAttrs.OPEN],
        },
      },
      {
        name: '.kibana',
        tags: [
          {
            key: 'alias',
            name: 'Alias',
            color: 'default',
          },
        ],
        item: {
          name: '.kibana',
          indices: ['.kibana_8.0.0_001'],
        },
      },
    ];

    expect(systemIndexes.some(isUserDataIndex)).toBe(false);
  });

  test('data index is data index', () => {
    const dataIndex: MatchedItem = {
      name: 'kibana_sample_data_ecommerce',
      tags: [
        {
          key: 'index',
          name: 'Index',
          color: 'default',
        },
      ],
      item: {
        name: 'kibana_sample_data_ecommerce',
        attributes: [ResolveIndexResponseItemIndexAttrs.OPEN],
      },
    };

    expect(isUserDataIndex(dataIndex)).toBe(true);
  });

  test('fleet asset is not data index', () => {
    const fleetAssetIndex: MatchedItem = {
      name: 'logs-elastic_agent',
      tags: [
        {
          key: 'data_stream',
          name: 'Data stream',
          color: 'primary',
        },
      ],
      item: {
        name: 'logs-elastic_agent',
        backing_indices: ['.ds-logs-elastic_agent-2021.08.18-000001'],
        timestamp_field: '@timestamp',
      },
    };

    expect(isUserDataIndex(fleetAssetIndex)).toBe(false);
  });

  test('ent search logs not data index', () => {
    const fleetAssetIndex: MatchedItem = {
      name: 'logs-enterprise_search.api-default',
      tags: [
        {
          key: 'data_stream',
          name: 'Data stream',
          color: 'primary',
        },
      ],
      item: {
        name: 'logs-enterprise_search.api-default',
        backing_indices: ['.ds-logs-enterprise_search.api-default-2022.03.07-000001'],
        timestamp_field: '@timestamp',
      },
    };

    expect(isUserDataIndex(fleetAssetIndex)).toBe(false);
  });

  test('metrics-endpoint.metadata_current_default is not data index', () => {
    const fleetAssetIndex: MatchedItem = {
      name: 'metrics-endpoint.metadata_current_default',
      tags: [{ key: 'index', name: 'Index', color: 'default' }],
      item: {
        name: 'metrics-endpoint.metadata_current_default',
        attributes: [ResolveIndexResponseItemIndexAttrs.OPEN],
      },
    };
    expect(isUserDataIndex(fleetAssetIndex)).toBe(false);
  });

  test('apm sources are not user sources', () => {
    const apmSources: MatchedItem[] = [
      {
        name: 'apm-7.14.1-error',
        tags: [
          {
            key: 'alias',
            name: 'Alias',
            color: 'default',
          },
        ],
        item: {
          name: 'apm-7.14.1-error',
          indices: ['apm-7.14.1-error-000001'],
        },
      },
      {
        name: 'apm-7.14.1-error-000001',
        tags: [
          {
            key: 'index',
            name: 'Index',
            color: 'default',
          },
        ],
        item: {
          name: 'apm-7.14.1-error-000001',
          aliases: ['apm-7.14.1-error'],
          attributes: [ResolveIndexResponseItemIndexAttrs.OPEN],
        },
      },
      {
        name: 'apm-7.14.1-metric',
        tags: [
          {
            key: 'alias',
            name: 'Alias',
            color: 'default',
          },
        ],
        item: {
          name: 'apm-7.14.1-metric',
          indices: ['apm-7.14.1-metric-000001'],
        },
      },
      {
        name: 'apm-7.14.1-metric-000001',
        tags: [
          {
            key: 'index',
            name: 'Index',
            color: 'default',
          },
        ],
        item: {
          name: 'apm-7.14.1-metric-000001',
          aliases: ['apm-7.14.1-metric'],
          attributes: [ResolveIndexResponseItemIndexAttrs.OPEN],
        },
      },
      {
        name: 'apm-7.14.1-onboarding-2021.08.25',
        tags: [
          {
            key: 'index',
            name: 'Index',
            color: 'default',
          },
        ],
        item: {
          name: 'apm-7.14.1-onboarding-2021.08.25',
          attributes: [ResolveIndexResponseItemIndexAttrs.OPEN],
        },
      },
      {
        name: 'apm-7.14.1-profile',
        tags: [
          {
            key: 'alias',
            name: 'Alias',
            color: 'default',
          },
        ],
        item: {
          name: 'apm-7.14.1-profile',
          indices: ['apm-7.14.1-profile-000001'],
        },
      },
      {
        name: 'apm-7.14.1-profile-000001',
        tags: [
          {
            key: 'index',
            name: 'Index',
            color: 'default',
          },
        ],
        item: {
          name: 'apm-7.14.1-profile-000001',
          aliases: ['apm-7.14.1-profile'],
          attributes: [ResolveIndexResponseItemIndexAttrs.OPEN],
        },
      },
      {
        name: 'apm-7.14.1-span',
        tags: [
          {
            key: 'alias',
            name: 'Alias',
            color: 'default',
          },
        ],
        item: {
          name: 'apm-7.14.1-span',
          indices: ['apm-7.14.1-span-000001'],
        },
      },
      {
        name: 'apm-7.14.1-span-000001',
        tags: [
          {
            key: 'index',
            name: 'Index',
            color: 'default',
          },
        ],
        item: {
          name: 'apm-7.14.1-span-000001',
          aliases: ['apm-7.14.1-span'],
          attributes: [ResolveIndexResponseItemIndexAttrs.OPEN],
        },
      },
      {
        name: 'apm-7.14.1-transaction',
        tags: [
          {
            key: 'alias',
            name: 'Alias',
            color: 'default',
          },
        ],
        item: {
          name: 'apm-7.14.1-transaction',
          indices: ['apm-7.14.1-transaction-000001'],
        },
      },
      {
        name: 'apm-7.14.1-transaction-000001',
        tags: [
          {
            key: 'index',
            name: 'Index',
            color: 'default',
          },
        ],
        item: {
          name: 'apm-7.14.1-transaction-000001',
          aliases: ['apm-7.14.1-transaction'],
          attributes: [ResolveIndexResponseItemIndexAttrs.OPEN],
        },
      },
    ];

    expect(apmSources.some(isUserDataIndex)).toBe(false);
  });
});

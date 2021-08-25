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
});

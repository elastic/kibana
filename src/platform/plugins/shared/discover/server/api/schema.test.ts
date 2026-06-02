/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  AS_CODE_ESQL_DATA_SOURCE_TYPE,
} from '@kbn/as-code-data-views-schema';
import {
  discoverSessionApiRequestBodySchema,
  discoverSessionApiResponseSchema,
  discoverSessionDataSchema,
  type DiscoverSessionApiClassicTab,
  type DiscoverSessionApiEsqlTab,
} from './schema';

const classicTab = {
  id: 'tab-classic',
  label: 'Logs',
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: 'logs-data-view',
  },
  filters: [],
  sort: [],
  view_mode: 'documents',
  hide_chart: false,
  hide_table: false,
  time_restore: false,
};

const esqlTab = {
  id: 'tab-esql',
  label: 'ES|QL',
  data_source: {
    type: AS_CODE_ESQL_DATA_SOURCE_TYPE,
    query: 'FROM logs-* | LIMIT 10',
  },
  sort: [],
  hide_chart: false,
  hide_table: false,
  time_restore: false,
};

const multiTabSessionData = {
  title: 'My Discover session',
  description: '',
  tabs: [classicTab, esqlTab],
};

describe('discoverSessionDataSchema', () => {
  it('validates a classic data view tab', () => {
    const validated = discoverSessionDataSchema.validate({
      title: 'Classic only',
      tabs: [classicTab],
    });

    const tab = validated.tabs[0] as DiscoverSessionApiClassicTab;

    expect(validated.tabs).toHaveLength(1);
    expect(tab.data_source.type).toBe(AS_CODE_DATA_VIEW_REFERENCE_TYPE);
    expect(tab.filters).toEqual([]);
    expect(tab.view_mode).toBe('documents');
  });

  it('validates an ES|QL tab', () => {
    const validated = discoverSessionDataSchema.validate({
      title: 'ES|QL only',
      tabs: [esqlTab],
    });

    const tab = validated.tabs[0] as DiscoverSessionApiEsqlTab;

    expect(tab.data_source.type).toBe(AS_CODE_ESQL_DATA_SOURCE_TYPE);
    expect(tab.data_source.query).toBe('FROM logs-* | LIMIT 10');
  });

  it('validates a multi-tab session', () => {
    const validated = discoverSessionDataSchema.validate(multiTabSessionData);

    expect(validated.tabs).toHaveLength(2);
    expect(validated.description).toBe('');
  });

  it('applies schema defaults for a fully qualified representation', () => {
    const validated = discoverSessionDataSchema.validate({
      title: 'Defaults',
      tabs: [classicTab],
    });

    const tab = validated.tabs[0] as DiscoverSessionApiClassicTab;

    expect(tab.hide_chart).toBe(false);
    expect(tab.hide_table).toBe(false);
    expect(tab.time_restore).toBe(false);
    expect(tab.sort).toEqual([]);
    expect(tab.filters).toEqual([]);
    expect(tab.view_mode).toBe('documents');
  });

  it('validates vis_context with opaque Lens attributes', () => {
    const validated = discoverSessionDataSchema.validate({
      title: 'With chart',
      tabs: [
        {
          ...classicTab,
          vis_context: {
            suggestion_type: 'line',
            attributes: {
              visualizationType: 'lnsXY',
              state: { foo: 'bar' },
            },
          },
        },
      ],
    });

    expect(validated.tabs[0].vis_context).toEqual({
      suggestion_type: 'line',
      attributes: {
        visualizationType: 'lnsXY',
        state: { foo: 'bar' },
      },
    });
  });

  it('rejects an empty vis_context object (use omission to indicate a cleared chart)', () => {
    expect(() =>
      discoverSessionDataSchema.validate({
        title: 'Empty vis context',
        tabs: [
          {
            ...classicTab,
            vis_context: {},
          },
        ],
      })
    ).toThrow();
  });

  it('rejects vis_context request_data (inferred from tab fields at runtime)', () => {
    expect(() =>
      discoverSessionDataSchema.validate({
        title: 'With request_data',
        tabs: [
          {
            ...classicTab,
            breakdown_field: 'host.name',
            chart_interval: 'auto',
            vis_context: {
              suggestion_type: 'line',
              request_data: {
                time_interval: 'auto',
                data_view_id: 'logs-data-view',
                time_field: '@timestamp',
                breakdown_field: 'host.name',
              },
              attributes: {
                visualizationType: 'lnsXY',
                state: { foo: 'bar' },
              },
            },
          },
        ],
      })
    ).toThrow();
  });

  it('rejects legacy stringified control group JSON', () => {
    expect(() =>
      discoverSessionDataSchema.validate({
        title: 'Invalid controls',
        tabs: [
          {
            ...classicTab,
            controlGroupJson: '{"panel-1":{}}',
          },
        ],
      })
    ).toThrow();
  });

  it('rejects legacy flattened control panels map shape', () => {
    expect(() =>
      discoverSessionDataSchema.validate({
        title: 'Invalid controls map',
        tabs: [
          {
            ...classicTab,
            control_panels: {
              'panel-1': {
                type: 'esql_control',
                order: 0,
                variable_name: 'foo',
                control_type: 'STATIC_VALUES',
                available_options: ['bar'],
              },
            },
          },
        ],
      })
    ).toThrow();
  });

  it('validates control_panels using the controls group array schema', () => {
    const validated = discoverSessionDataSchema.validate({
      title: 'With controls',
      tabs: [
        {
          ...esqlTab,
          control_panels: [
            {
              type: 'esql_control',
              id: 'panel-1',
              config: {
                control_type: 'STATIC_VALUES',
                variable_name: 'foo',
                variable_type: 'values',
                available_options: ['bar', 'baz'],
                selected_options: ['bar'],
                single_select: true,
              },
            },
          ],
        },
      ],
    });

    expect(validated.tabs[0].control_panels).toEqual([
      {
        type: 'esql_control',
        id: 'panel-1',
        grow: false,
        width: 'medium',
        config: {
          control_type: 'STATIC_VALUES',
          variable_name: 'foo',
          variable_type: 'values',
          available_options: ['bar', 'baz'],
          selected_options: ['bar'],
          single_select: true,
        },
      },
    ]);
  });

  it('rejects an invalid data source type', () => {
    expect(() =>
      discoverSessionDataSchema.validate({
        title: 'Bad data source',
        tabs: [
          {
            ...classicTab,
            data_source: {
              type: 'invalid_type',
              ref_id: 'logs-data-view',
            },
          },
        ],
      })
    ).toThrow();
  });

  it('rejects an unsupported nested data_source shape', () => {
    expect(() =>
      discoverSessionDataSchema.validate({
        title: 'Nested data source',
        tabs: [
          {
            ...classicTab,
            data_source: {
              data_view: {
                ref_id: 'logs-data-view',
              },
            },
          },
        ],
      })
    ).toThrow();
  });

  it('rejects sessions with no tabs', () => {
    expect(() =>
      discoverSessionDataSchema.validate({
        title: 'Empty',
        tabs: [],
      })
    ).toThrow();
  });
});

describe('discoverSessionApiResponseSchema', () => {
  it('validates the standard as-code API envelope', () => {
    const validated = discoverSessionApiResponseSchema.validate({
      id: 'session-id',
      data: multiTabSessionData,
      meta: {
        created_at: '2026-04-27T00:00:00.000Z',
        updated_at: '2026-04-27T00:00:00.000Z',
        version: 'WzEsMV0=',
      },
    });

    expect(validated.id).toBe('session-id');
    expect(validated.data.tabs).toHaveLength(2);
    expect(validated.meta.version).toBe('WzEsMV0=');
  });
});

describe('discoverSessionApiRequestBodySchema', () => {
  it('validates create/update request bodies', () => {
    const validated = discoverSessionApiRequestBodySchema.validate({
      data: multiTabSessionData,
    });

    expect(validated.data.title).toBe('My Discover session');
  });
});

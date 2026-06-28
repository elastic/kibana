/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

<<<<<<< HEAD
import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';
import type { LensPartitionVisualizationState } from '@kbn/lens-common';

import type { LensApiConfigChartType } from '../../schema';
import type { MosaicConfig } from '../../schema/charts/mosaic';
import type { PieConfig } from '../../schema/charts/pie';
import type { TreemapConfig } from '../../schema/charts/treemap';
import type { WaffleConfig } from '../../schema/charts/waffle';
import { AUTO_COLOR, DEFAULT_CATEGORICAL_COLOR_MAPPING } from '../../schema/color';
=======
import type { LensApiConfig } from '../../schema';
import type { PieConfig } from '../../schema/charts/pie';
import { mosaicConfigSchema } from '../../schema/charts/mosaic';
import { partitionConfigSchema } from '../../schema/charts/partition';
import { pieConfigSchema } from '../../schema/charts/pie';
import type { TreemapConfig } from '../../schema/charts/treemap';
import { treemapConfigSchema } from '../../schema/charts/treemap';
import type { WaffleConfig } from '../../schema/charts/waffle';
import { waffleConfigSchema } from '../../schema/charts/waffle';
import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';
import { AUTO_COLOR, DEFAULT_CATEGORICAL_COLOR_MAPPING } from '../../schema/color';
import { validateAPIConverter, validateConverter } from '../validate';
>>>>>>> 9.4
import { esqlCharts } from './lens_api_config.mock';
import { LensConfigBuilder } from '../../config_builder';
import {
  mosaicLegacyBasicState,
  pieLegacyBasicState,
  treemapLegacyBasicState,
  waffleLegacyBasicState,
  pieLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
  treemapLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
  mosaicLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
  waffleLegacyAdvancedStateWithCollapsedGroups,
  pieLegacyESQLState,
  treemapLegacyESQLState,
  mosaicLegacyESQLState,
  waffleLegacyESQLState,
} from './lens_state_config.mock';
import { validator } from '../utils/validator';
import type { LensAttributes } from '../../types';
import type { PartitionConfig } from '../../schema/charts/partition';

describe('Partition', () => {
  describe('state transform validation', () => {
    const datasets = [
<<<<<<< HEAD
      { name: 'pie basic', type: 'pie', config: pieLegacyBasicState },
      { name: 'treemap basic', type: 'treemap', config: treemapLegacyBasicState },
      { name: 'mosaic basic', type: 'mosaic', config: mosaicLegacyBasicState },
      { name: 'waffle basic', type: 'waffle', config: waffleLegacyBasicState },
=======
      { name: 'pie basic', config: pieLegacyBasicState, schema: pieConfigSchema },
      { name: 'treemap basic', config: treemapLegacyBasicState, schema: treemapConfigSchema },
      { name: 'mosaic basic', config: mosaicLegacyBasicState, schema: mosaicConfigSchema },
      { name: 'waffle basic', config: waffleLegacyBasicState, schema: waffleConfigSchema },
>>>>>>> 9.4
      {
        name: 'pie advanced with collapsed groups',
        type: 'pie',
        config: pieLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
<<<<<<< HEAD
=======
        schema: pieConfigSchema,
>>>>>>> 9.4
      },
      {
        name: 'treemap advanced with collapsed groups',
        type: 'treemap',
        config: treemapLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
<<<<<<< HEAD
=======
        schema: treemapConfigSchema,
>>>>>>> 9.4
      },
      {
        name: 'mosaic advanced with collapsed groups',
        type: 'mosaic',
        config: mosaicLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
<<<<<<< HEAD
=======
        schema: mosaicConfigSchema,
>>>>>>> 9.4
      },
      {
        name: 'waffle advanced with collapsed groups',
        type: 'waffle',
        config: waffleLegacyAdvancedStateWithCollapsedGroups,
<<<<<<< HEAD
=======
        schema: waffleConfigSchema,
>>>>>>> 9.4
      },
      {
        name: 'pie esql basic',
        type: 'pie',
        config: pieLegacyESQLState,
<<<<<<< HEAD
=======
        schema: pieConfigSchema,
>>>>>>> 9.4
      },
      {
        name: 'treemap esql basic',
        type: 'treemap',
        config: treemapLegacyESQLState,
<<<<<<< HEAD
=======
        schema: treemapConfigSchema,
>>>>>>> 9.4
      },
      {
        name: 'mosaic esql basic',
        type: 'mosaic',
        config: mosaicLegacyESQLState,
<<<<<<< HEAD
=======
        schema: mosaicConfigSchema,
>>>>>>> 9.4
      },
      {
        name: 'waffle esql basic',
        type: 'waffle',
        config: waffleLegacyESQLState,
<<<<<<< HEAD
      },
    ] satisfies {
      name: string;
      type: Extract<LensApiConfigChartType, 'pie' | 'treemap' | 'mosaic' | 'waffle'>;
      config: LensAttributes;
    }[];

    for (const { name, type, config } of datasets) {
      it(`should convert from state ${name} chart`, () => {
        validator[type].fromState(config);
=======
        schema: waffleConfigSchema,
      },
    ];
    for (const { name, config, schema } of datasets) {
      it(`should convert a legacy ${name} chart`, () => {
        validateConverter(config, schema);
        validateConverter(config, partitionConfigSchema);
>>>>>>> 9.4
      });
    }
  });

  describe('api transform validation', () => {
    for (const config of esqlCharts) {
      it(`should convert an API ${config.title} chart`, () => {
<<<<<<< HEAD
        validator[config.type].fromApi(
          config as any, // TODO fix test types here'
          ['ignore_global_filters', 'sampling']
        );
=======
        validateAPIConverter(config as LensApiConfig, partitionConfigSchema, [
          'sampling',
          'ignore_global_filters',
        ]);
>>>>>>> 9.4
      });
    }
  });

  describe('empty string collapseFns handling', () => {
    it('should treat empty string collapseFns as undefined and apply color mapping to first group (Lens → API)', () => {
      const builder = new LensConfigBuilder(undefined, true);
      (pieLegacyESQLState.state
        .visualization as LensPartitionVisualizationState)!.layers[0].collapseFns!.partition_value_accessor_group_by_0 =
        '' as unknown as 'min';
      const apiConfig = builder.toAPIFormat(pieLegacyESQLState) as PieConfig;

      // The group should have color mapping (since empty string collapseFns means no collapse)
      expect(apiConfig.group_by?.[0].color).toHaveProperty('mode', 'categorical');

      // The group shouldn't have collapse_by (empty strings should be stripped)
      expect(apiConfig.group_by?.[0]).not.toHaveProperty('collapse_by');
    });
  });

  describe('color default application', () => {
    const baseDataSource = {
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'test-index',
      time_field: '@timestamp',
    } as const;

    it('should emit AUTO_COLOR on pie metric when no group_by is present', () => {
      const config = {
        type: 'pie',
        title: 'Pie color default test',
        data_source: baseDataSource,
        metrics: [{ operation: 'count', empty_as_null: false }],
        sampling: 1,
        ignore_global_filters: false,
      } satisfies PieConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as PieConfig;

      expect(apiOutput.metrics[0].color).toEqual(AUTO_COLOR);
    });

    it('should emit default categorical color mapping on group_by when present', () => {
      const config = {
        type: 'pie',
        title: 'Pie group_by color default test',
        data_source: baseDataSource,
        metrics: [{ operation: 'count', empty_as_null: false }],
        group_by: [
          {
            operation: 'terms',
            fields: ['tags.keyword'],
            limit: 3,
          },
        ],
        sampling: 1,
        ignore_global_filters: false,
      } satisfies PieConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as PieConfig;

      expect(apiOutput.group_by?.[0].color).toEqual(DEFAULT_CATEGORICAL_COLOR_MAPPING);
    });

    it('should emit AUTO_COLOR on treemap metric when no group_by is present', () => {
      const config = {
        type: 'treemap',
        title: 'Treemap color default test',
        data_source: baseDataSource,
        metrics: [{ operation: 'count', empty_as_null: false }],
        sampling: 1,
        ignore_global_filters: false,
      } satisfies TreemapConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as TreemapConfig;

      expect(apiOutput.metrics[0].color).toEqual(AUTO_COLOR);
    });

    it('should emit AUTO_COLOR on waffle metric when no group_by is present', () => {
      const config = {
        type: 'waffle',
        title: 'Waffle color default test',
        data_source: baseDataSource,
        metrics: [{ operation: 'count', empty_as_null: false }],
        sampling: 1,
        ignore_global_filters: false,
      } satisfies WaffleConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as WaffleConfig;

      expect(apiOutput.metrics[0].color).toEqual(AUTO_COLOR);
    });
  });
<<<<<<< HEAD

  describe('API to state colorsByDimension index preservation', () => {
    const baseDataSource = {
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'test-index',
      time_field: '@timestamp',
    } as const;

    const RED = '#ff0000';
    const BLUE = '#0000ff';

    it('should preserve sparse static colors across metric positions', () => {
      // Four metrics, with static colors on positions 1, 3 and 4 only.
      const config = {
        type: 'pie',
        title: 'colorsByDimension sparse test',
        data_source: baseDataSource,
        metrics: [
          { operation: 'count', empty_as_null: false },
          { operation: 'count', empty_as_null: false, color: { type: 'static', color: RED } },
          { operation: 'count', empty_as_null: false },
          { operation: 'count', empty_as_null: false, color: { type: 'static', color: BLUE } },
          { operation: 'count', empty_as_null: false, color: { type: 'static', color: BLUE } },
        ],
        sampling: 1,
        ignore_global_filters: false,
      } satisfies PieConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const vizState = lensState.state.visualization as LensPartitionVisualizationState;
      const apiOutput = builder.toAPIFormat(lensState) as PieConfig;

      expect(vizState.layers[0].colorsByDimension).toEqual({
        partition_value_accessor_metric_1: RED,
        partition_value_accessor_metric_3: BLUE,
        partition_value_accessor_metric_4: BLUE,
      });
      expect(apiOutput.metrics[0].color).toEqual(AUTO_COLOR);
      expect(apiOutput.metrics[1].color).toEqual({ type: 'static', color: RED });
      expect(apiOutput.metrics[2].color).toEqual(AUTO_COLOR);
      expect(apiOutput.metrics[3].color).toEqual({ type: 'static', color: BLUE });
      expect(apiOutput.metrics[4].color).toEqual({ type: 'static', color: BLUE });
    });
  });

  describe('waffle legend values', () => {
    const baseDataSource = {
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'test-index',
      time_field: '@timestamp',
    } as const;

    const baseWaffleConfig = {
      type: 'waffle',
      title: 'Waffle legend test',
      data_source: baseDataSource,
      metrics: [{ operation: 'count', empty_as_null: false }],
      group_by: [
        {
          operation: 'terms',
          fields: ['tags.keyword'],
          limit: 3,
        },
      ],
      sampling: 1,
      ignore_global_filters: false,
    } satisfies WaffleConfig;

    it('should map legend.values: ["absolute"] to legendStats: ["value"] in state', () => {
      const config = {
        ...baseWaffleConfig,
        legend: { values: ['absolute'] as ['absolute'] },
      } satisfies WaffleConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const vizState = lensState.state.visualization as LensPartitionVisualizationState;

      expect(vizState.layers[0].legendStats).toEqual(['value']);
    });

    it('should map omitted legend.values to legendStats: [] in state', () => {
      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(baseWaffleConfig);
      const vizState = lensState.state.visualization as LensPartitionVisualizationState;

      expect(vizState.layers[0].legendStats).toEqual([]);
    });

    it('should roundtrip legend.values: ["absolute"] correctly', () => {
      const config = {
        ...baseWaffleConfig,
        legend: { values: ['absolute'] as ['absolute'] },
      } satisfies WaffleConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as WaffleConfig;

      expect(apiOutput.legend?.values).toEqual(['absolute']);
    });

    it('should roundtrip omitted legend.values correctly', () => {
      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(baseWaffleConfig);
      const apiOutput = builder.toAPIFormat(lensState) as WaffleConfig;

      expect(apiOutput.legend?.values).toBeUndefined();
    });

    it('should serialize existing waffle state without legendStats as legend.values: ["absolute"]', () => {
      const builder = new LensConfigBuilder(undefined, true);
      const apiOutput = builder.toAPIFormat(waffleLegacyBasicState) as WaffleConfig;

      expect(apiOutput.legend?.values).toEqual(['absolute']);
    });
  });

  describe('legend position', () => {
    const baseDataSource = {
      type: AS_CODE_DATA_VIEW_SPEC_TYPE,
      index_pattern: 'test-index',
      time_field: '@timestamp',
    } as const;

    const basePartitionConfig = {
      title: 'Partition legend position test',
      data_source: baseDataSource,
      group_by: [
        {
          operation: 'terms',
          fields: ['tags.keyword'],
          limit: 3,
        },
      ],
      sampling: 1,
      ignore_global_filters: false,
    } satisfies Omit<PartitionConfig, 'type'>;

    const basePieConfig = {
      ...basePartitionConfig,
      type: 'pie',
      metrics: [{ operation: 'count', empty_as_null: false }],
    } satisfies PieConfig;

    const baseTreemapConfig = {
      ...basePieConfig,
      type: 'treemap',
      metrics: [{ operation: 'count', empty_as_null: false }],
    } satisfies TreemapConfig;

    const baseWaffleConfig = {
      ...basePieConfig,
      type: 'waffle',
      metrics: [{ operation: 'count', empty_as_null: false }],
    } satisfies WaffleConfig;

    const baseMosaicConfig = {
      ...basePieConfig,
      type: 'mosaic',
      metric: { operation: 'count', empty_as_null: false },
    } satisfies MosaicConfig;

    it.each<[string, PieConfig | TreemapConfig | WaffleConfig | MosaicConfig]>([
      ['pie', basePieConfig],
      ['treemap', baseTreemapConfig],
      ['waffle', baseWaffleConfig],
      ['mosaic', baseMosaicConfig],
    ])('should roundtrip for %s chart', (_name, config) => {
      const partitionConfig = {
        ...config,
        legend: { position: 'bottom' },
      } satisfies PartitionConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(partitionConfig);
      const apiOutput = builder.toAPIFormat(lensState) as PieConfig;

      expect(apiOutput.legend?.position).toBe('bottom');
    });
  });
=======
>>>>>>> 9.4
});

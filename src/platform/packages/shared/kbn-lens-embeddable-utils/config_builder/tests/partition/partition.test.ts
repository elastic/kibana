/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensApiConfig } from '../../schema';
import type { PieConfig } from '../../schema/charts/pie';
import { mosaicConfigSchema } from '../../schema/charts/mosaic';
import { partitionConfigSchema } from '../../schema/charts/partition';
import { pieConfigSchema } from '../../schema/charts/pie';
import { treemapConfigSchema } from '../../schema/charts/treemap';
import { waffleConfigSchema } from '../../schema/charts/waffle';
import { validateAPIConverter, validateConverter } from '../validate';
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
import type { LensPartitionVisualizationState } from '@kbn/lens-common';

describe('Partition', () => {
  describe('validateConverter', () => {
    const datasets = [
      { name: 'pie basic', config: pieLegacyBasicState, schema: pieConfigSchema },
      { name: 'treemap basic', config: treemapLegacyBasicState, schema: treemapConfigSchema },
      { name: 'mosaic basic', config: mosaicLegacyBasicState, schema: mosaicConfigSchema },
      { name: 'waffle basic', config: waffleLegacyBasicState, schema: waffleConfigSchema },
      {
        name: 'pie advanced with collapsed groups',
        config: pieLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
        schema: pieConfigSchema,
      },
      {
        name: 'treemap advanced with collapsed groups',
        config: treemapLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
        schema: treemapConfigSchema,
      },
      {
        name: 'mosaic advanced with collapsed groups',
        config: mosaicLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
        schema: mosaicConfigSchema,
      },
      {
        name: 'waffle advanced with collapsed groups',
        config: waffleLegacyAdvancedStateWithCollapsedGroups,
        schema: waffleConfigSchema,
      },
      {
        name: 'pie esql basic',
        config: pieLegacyESQLState,
        schema: pieConfigSchema,
      },
      {
        name: 'treemap esql basic',
        config: treemapLegacyESQLState,
        schema: treemapConfigSchema,
      },
      {
        name: 'mosaic esql basic',
        config: mosaicLegacyESQLState,
        schema: mosaicConfigSchema,
      },
      {
        name: 'waffle esql basic',
        config: waffleLegacyESQLState,
        schema: waffleConfigSchema,
      },
    ];
    for (const { name, config, schema } of datasets) {
      it(`should convert a legacy ${name} chart`, () => {
        validateConverter(config, schema);
        validateConverter(config, partitionConfigSchema);
      });
    }
  });

  describe('validateAPIConverter', () => {
    for (const config of esqlCharts) {
      it(`should convert an API ${config.title} chart`, () => {
        validateAPIConverter(config as LensApiConfig, partitionConfigSchema, [
          'sampling',
          'ignore_global_filters',
        ]);
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
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensApiState } from '../../schema';
import type { PieState } from '../../schema/charts/pie';
import { mosaicStateSchema } from '../../schema/charts/mosaic';
import { partitionStateSchema } from '../../schema/charts/partition';
import { pieStateSchema } from '../../schema/charts/pie';
import { treemapStateSchema } from '../../schema/charts/treemap';
import { waffleStateSchema } from '../../schema/charts/waffle';
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
      { name: 'pie/donut basic', config: pieLegacyBasicState, schema: pieStateSchema },
      { name: 'treemap basic', config: treemapLegacyBasicState, schema: treemapStateSchema },
      { name: 'mosaic basic', config: mosaicLegacyBasicState, schema: mosaicStateSchema },
      { name: 'waffle basic', config: waffleLegacyBasicState, schema: waffleStateSchema },
      {
        name: 'pie/donut advanced with collapsed groups',
        config: pieLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
        schema: pieStateSchema,
      },
      {
        name: 'treemap advanced with collapsed groups',
        config: treemapLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
        schema: treemapStateSchema,
      },
      {
        name: 'mosaic advanced with collapsed groups',
        config: mosaicLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
        schema: mosaicStateSchema,
      },
      {
        name: 'waffle advanced with collapsed groups',
        config: waffleLegacyAdvancedStateWithCollapsedGroups,
        schema: waffleStateSchema,
      },
      {
        name: 'pie esql basic',
        config: pieLegacyESQLState,
        schema: pieStateSchema,
      },
      {
        name: 'treemap esql basic',
        config: treemapLegacyESQLState,
        schema: treemapStateSchema,
      },
      {
        name: 'mosaic esql basic',
        config: mosaicLegacyESQLState,
        schema: mosaicStateSchema,
      },
      {
        name: 'waffle esql basic',
        config: waffleLegacyESQLState,
        schema: waffleStateSchema,
      },
    ];
    for (const { name, config, schema } of datasets) {
      it(`should convert a legacy ${name} chart`, () => {
        validateConverter(config, schema);
        validateConverter(config, partitionStateSchema);
      });
    }
  });

  describe('validateAPIConverter', () => {
    for (const config of esqlCharts) {
      it(`should convert an API ${config.title} chart`, () => {
        validateAPIConverter(config as LensApiState, partitionStateSchema);
      });
    }
  });

  describe('empty string collapseFns handling', () => {
    it('should treat empty string collapseFns as undefined and apply color mapping to first group (Lens → API)', () => {
      const builder = new LensConfigBuilder(undefined, true);
      (pieLegacyESQLState.state
        .visualization as LensPartitionVisualizationState)!.layers[0].collapseFns!.partition_value_accessor_group_by_0 =
        '' as unknown as 'min';
      const apiConfig = builder.toAPIFormat(pieLegacyESQLState) as PieState;

      // The group should have color mapping (since empty string collapseFns means no collapse)
      expect(apiConfig.group_by?.[0].color).toHaveProperty('mode', 'categorical');

      // The group shouldn't have collapse_by (empty strings should be stripped)
      expect(apiConfig.group_by?.[0]).not.toHaveProperty('collapse_by');
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensPartitionVisualizationState } from '@kbn/lens-common';

import type { LensApiStateChartType } from '../../schema';
import type { PieState } from '../../schema/charts/pie';
import { LensConfigBuilder } from '../../config_builder';
import type { LensAttributes } from '../../types';
import { validator } from '../utils/validator';
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
import { esqlCharts } from './lens_api_config.mock';

describe('Partition', () => {
  describe('state transform validation', () => {
    const datasets = [
      { name: 'pie/donut basic', type: 'pie', config: pieLegacyBasicState },
      { name: 'treemap basic', type: 'treemap', config: treemapLegacyBasicState },
      { name: 'mosaic basic', type: 'mosaic', config: mosaicLegacyBasicState },
      { name: 'waffle basic', type: 'waffle', config: waffleLegacyBasicState },
      {
        name: 'pie/donut advanced with collapsed groups',
        type: 'pie',
        config: pieLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
      },
      {
        name: 'treemap advanced with collapsed groups',
        type: 'treemap',
        config: treemapLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
      },
      {
        name: 'mosaic advanced with collapsed groups',
        type: 'mosaic',
        config: mosaicLegacyAdvancedStateWithMultipleMetricsAndCollapsedGroups,
      },
      {
        name: 'waffle advanced with collapsed groups',
        type: 'waffle',
        config: waffleLegacyAdvancedStateWithCollapsedGroups,
      },
      {
        name: 'pie esql basic',
        type: 'pie',
        config: pieLegacyESQLState,
      },
      {
        name: 'treemap esql basic',
        type: 'treemap',
        config: treemapLegacyESQLState,
      },
      {
        name: 'mosaic esql basic',
        type: 'mosaic',
        config: mosaicLegacyESQLState,
      },
      {
        name: 'waffle esql basic',
        type: 'waffle',
        config: waffleLegacyESQLState,
      },
    ] satisfies {
      name: string;
      type: Extract<LensApiStateChartType, 'pie' | 'treemap' | 'mosaic' | 'waffle'>;
      config: LensAttributes;
    }[];

    for (const { name, type, config } of datasets) {
      it(`should convert from state ${name} chart`, () => {
        validator[type].fromState(config);
      });
    }
  });

  describe('api transform validation', () => {
    for (const config of esqlCharts) {
      it(`should convert from api ${config.title} chart`, () => {
        validator[config.type].fromApi(config as any); // TODO fix test types here
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

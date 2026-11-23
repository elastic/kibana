/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LensConfigBuilder } from '../../config_builder';
import type { LensApiConfigChartType } from '../../schema';
import type { LensAttributes } from '../../types';
import { validator } from '../utils/validator';
import { simpleMetricAttributes } from '../metric/lens_state_config.mock';
import { simpleMetricAPIAttributes } from '../metric/lens_api_config.mock';
import { gaugeAttributes, gaugeESQLAttributes } from '../gauge/lens_state_config.mock';
import { basicGaugeWithDataView, esqlGauge } from '../gauge/lens_api_config.mock';
import { simpleLegacyMetricAttributes } from '../legacy_metric/lens_state_config.mock';
import { basicLegacyMetricWithDataView } from '../legacy_metric/lens_api_config.mock';
import { tagcloudAttributes } from '../tagcloud/lens_state_config.mock';
import { basicTagcloudWithDataView } from '../tagcloud/lens_api_config.mock';
import { regionMapAttributes } from '../region_map/lens_state_config.mock';
import { basicRegionMapWithDataView } from '../region_map/lens_api_config.mock';
import { singleMetricDatatableAttributes } from '../datatable/lens_state_config_dsl.mock';
import { fullConfigDatatableWithDataView } from '../datatable/lens_api_config_dsl.mock';
import { simple as simpleHeatmapAttributes } from '../heatmap/dsl.mocks';
import { minimalAttributesXY, apiXYWithNoYTitleAndInsideLegend } from '../xy/basicXY.mock';
import {
  pieLegacyBasicState,
  treemapLegacyBasicState,
  mosaicLegacyBasicState,
  waffleLegacyBasicState,
} from '../partition/lens_state_config.mock';

const withUseEsql = (attributes: LensAttributes): LensAttributes => ({
  ...attributes,
  state: {
    ...attributes.state,
    datasourceStates: {
      ...attributes.state.datasourceStates,
      formBased: {
        ...attributes.state.datasourceStates.formBased,
        layers: attributes.state.datasourceStates.formBased?.layers ?? {},
        useEsql: true,
      },
    },
  },
});

// API fixtures are omitted for charts that only have ES|QL API fixtures (heatmap, partition charts).
const dslCharts: Array<{
  type: LensApiConfigChartType;
  state: LensAttributes;
  // Typed loosely: the fixtures come from per-chart mock files with their own config types.
  api?: Record<string, unknown>;
}> = [
  { type: 'metric', state: simpleMetricAttributes, api: simpleMetricAPIAttributes },
  { type: 'gauge', state: gaugeAttributes, api: basicGaugeWithDataView },
  {
    type: 'legacy_metric',
    state: simpleLegacyMetricAttributes,
    api: basicLegacyMetricWithDataView,
  },
  {
    type: 'tag_cloud',
    state: tagcloudAttributes as LensAttributes,
    api: basicTagcloudWithDataView,
  },
  {
    type: 'region_map',
    state: regionMapAttributes as LensAttributes,
    api: basicRegionMapWithDataView,
  },
  {
    type: 'data_table',
    state: singleMetricDatatableAttributes,
    api: fullConfigDatatableWithDataView,
  },
  { type: 'heatmap', state: simpleHeatmapAttributes },
  { type: 'xy', state: minimalAttributesXY, api: apiXYWithNoYTitleAndInsideLegend },
  { type: 'pie', state: pieLegacyBasicState as LensAttributes },
  { type: 'treemap', state: treemapLegacyBasicState as LensAttributes },
  { type: 'mosaic', state: mosaicLegacyBasicState as LensAttributes },
  { type: 'waffle', state: waffleLegacyBasicState as LensAttributes },
];

describe('use_esql', () => {
  describe.each(dslCharts)('$type', ({ type, state, api }) => {
    it('round-trips useEsql from state', () => {
      // validator.<type>.fromState converts state to API and back and expects the same state
      validator[type].fromState(withUseEsql(state));
    });

    it('exports use_esql only when useEsql is true', () => {
      const builder = new LensConfigBuilder(undefined, true);

      expect(builder.toAPIFormat(withUseEsql(state))).toHaveProperty('use_esql', true);
      expect(builder.toAPIFormat(state)).not.toHaveProperty('use_esql');
    });

    if (api) {
      it('round-trips use_esql from the API', () => {
        // validator.<type>.fromApi converts API to state and back and expects every value sent
        validator[type].fromApi({ ...api, use_esql: true } as never);
      });
    }
  });

  it('writes useEsql to the form-based state when importing use_esql', () => {
    const builder = new LensConfigBuilder(undefined, true);

    const attributes = builder.fromAPIFormat({
      ...simpleMetricAPIAttributes,
      use_esql: true,
    } as never);
    expect(attributes.state.datasourceStates.formBased?.useEsql).toBe(true);
  });

  it.each([
    { name: 'true', apiValue: { use_esql: true }, expected: true },
    { name: 'false', apiValue: { use_esql: false }, expected: false },
    { name: 'omitted', apiValue: {}, expected: false },
  ])('sets useEsql=$expected when use_esql is $name', ({ apiValue, expected }) => {
    const builder = new LensConfigBuilder(undefined, true);

    const attributes = builder.fromAPIFormat({
      ...simpleMetricAPIAttributes,
      ...apiValue,
    } as never);
    expect(attributes.state.datasourceStates.formBased?.useEsql === true).toBe(expected);
  });

  it('never exports use_esql for ES|QL charts', () => {
    const builder = new LensConfigBuilder(undefined, true);

    expect(builder.toAPIFormat(gaugeESQLAttributes)).not.toHaveProperty('use_esql');
  });

  it('does not add form-based state when importing use_esql on an ES|QL chart', () => {
    const builder = new LensConfigBuilder(undefined, true);

    const attributes = builder.fromAPIFormat({ ...esqlGauge, use_esql: true } as never);
    expect(attributes.state.datasourceStates.formBased).toBeUndefined();
  });
});

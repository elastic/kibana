/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ChartTypes } from '../../common/types';
import { createMockDonutParams, createMockPieParams } from '../mocks';
import { filterOutConfig } from './filter_out_config';

describe('filterOutConfig', () => {
  const config = createMockPieParams();
  const { last_level: lastLevel, truncate, ...restLabels } = config.labels;
  const configWithoutTruncateAndLastLevel = { ...config, labels: restLabels };

  it('returns full configuration for pie visualization', () => {
    const fullConfig = filterOutConfig(ChartTypes.PIE, config);

    expect(fullConfig).toEqual(config);
  });

  it('returns full configuration for donut visualization', () => {
    const donutConfig = createMockDonutParams();
    const fullDonutConfig = filterOutConfig(ChartTypes.DONUT, donutConfig);

    expect(fullDonutConfig).toEqual(donutConfig);
  });

  it('excludes truncate and last_level from labels for treemap', () => {
    const filteredOutConfig = filterOutConfig(ChartTypes.TREEMAP, config);

    expect(filteredOutConfig).toEqual(configWithoutTruncateAndLastLevel);
  });

  it('excludes truncate and last_level from labels for mosaic', () => {
    const filteredOutConfig = filterOutConfig(ChartTypes.MOSAIC, config);

    expect(filteredOutConfig).toEqual(configWithoutTruncateAndLastLevel);
  });

  it('excludes truncate and last_level from labels for waffle', () => {
    const filteredOutConfig = filterOutConfig(ChartTypes.WAFFLE, config);

    expect(filteredOutConfig).toEqual(configWithoutTruncateAndLastLevel);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getConfig } from './get_config';
import { visData, visParamsWithTwoYAxes } from '../mocks';

// ToDo: add more tests for all the config properties
describe('getConfig', () => {
  it('identifies it as a timeChart if the x axis has a date field', () => {
    const config = getConfig(visData, visParamsWithTwoYAxes);
    expect(config.isTimeChart).toBe(true);
  });

  it('not adds the current time marker if the param is set to false', () => {
    const config = getConfig(visData, visParamsWithTwoYAxes);
    expect(config.showCurrentTime).toBe(false);
  });

  it('adds the current time marker if the param is set to false', () => {
    const newVisParams = {
      ...visParamsWithTwoYAxes,
      addTimeMarker: true,
    };
    const config = getConfig(visData, newVisParams);
    expect(config.showCurrentTime).toBe(true);
  });

  it('enables the histogram mode for a date_histogram', () => {
    const config = getConfig(visData, visParamsWithTwoYAxes);
    expect(config.enableHistogramMode).toBe(true);
  });

  it('assigns the correct formatter per y axis', () => {
    const config = getConfig(visData, visParamsWithTwoYAxes);
    expect(config.yAxes.length).toBe(2);
    expect(config.yAxes[0].ticks?.formatter).toStrictEqual(config.aspects.y[1].formatter);
    expect(config.yAxes[1].ticks?.formatter).toStrictEqual(config.aspects.y[0].formatter);
  });
});

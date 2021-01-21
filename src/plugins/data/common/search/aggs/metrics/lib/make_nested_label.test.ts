/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { makeNestedLabel } from './make_nested_label';
import { IMetricAggConfig } from '../metric_agg_type';

describe('metric agg make_nested_label', () => {
  const generateAggConfig = (metricLabel: string): IMetricAggConfig => {
    return ({
      params: {
        customMetric: {
          makeLabel: () => {
            return metricLabel;
          },
        },
      },
      getParam(this: IMetricAggConfig, key: string) {
        return this.params[key];
      },
    } as unknown) as IMetricAggConfig;
  };

  it('should return a metric label with prefix', () => {
    const aggConfig = generateAggConfig('Count');
    const label = makeNestedLabel(aggConfig, 'derivative');

    expect(label).toEqual('Derivative of Count');
  });

  it('should return a numbered prefix', () => {
    const aggConfig = generateAggConfig('Derivative of Count');
    const label = makeNestedLabel(aggConfig, 'derivative');

    expect(label).toEqual('2. derivative of Count');
  });

  it('should return a prefix with correct order', () => {
    const aggConfig = generateAggConfig('3. derivative of Count');
    const label = makeNestedLabel(aggConfig, 'derivative');

    expect(label).toEqual('4. derivative of Count');
  });
});

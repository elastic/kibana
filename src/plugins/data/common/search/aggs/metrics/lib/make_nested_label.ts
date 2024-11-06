/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { startCase } from 'lodash';
import { IMetricAggConfig } from '../metric_agg_type';

export const makeNestedLabel = (aggConfig: IMetricAggConfig, label: string) => {
  const uppercaseLabel = startCase(label);
  const customMetric = aggConfig.getParam('customMetric');
  const metricAgg = aggConfig.getParam('metricAgg');

  if (customMetric) {
    let metricLabel = customMetric.makeLabel();

    if (metricLabel.includes(`${uppercaseLabel} of `)) {
      metricLabel = metricLabel.substring(`${uppercaseLabel} of `.length);
      metricLabel = `2. ${label} of ${metricLabel}`;
    } else if (metricLabel.includes(`${label} of `)) {
      metricLabel = parseInt(metricLabel.substring(0, 1), 10) + 1 + metricLabel.substring(1);
    } else {
      metricLabel = `${uppercaseLabel} of ${metricLabel}`;
    }
    return metricLabel;
  }

  const metric = aggConfig.aggConfigs.byId(metricAgg);

  if (!metric) {
    return '';
  }

  return `${uppercaseLabel} of ${metric.makeLabel()}`;
};

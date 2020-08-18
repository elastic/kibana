/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

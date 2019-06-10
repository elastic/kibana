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

import { AggConfig } from 'ui/vis';
import { i18n } from '@kbn/i18n';

const aggFilter = [
  '!top_hits',
  '!percentiles',
  '!median',
  '!std_dev',
  '!derivative',
  '!moving_avg',
  '!serial_diff',
  '!cumulative_sum',
  '!avg_bucket',
  '!max_bucket',
  '!min_bucket',
  '!sum_bucket',
];

// Returns true if the agg is compatible with the terms bucket
function isCompatibleAgg(agg: AggConfig) {
  return !aggFilter.includes(`!${agg.type.name}`);
}

function safeMakeLabel(agg: AggConfig) {
  try {
    return agg.makeLabel();
  } catch (e) {
    return i18n.translate('common.ui.aggTypes.buckets.terms.aggNotValidLabel', {
      defaultMessage: '- agg not valid -',
    });
  }
}

export { aggFilter, isCompatibleAgg, safeMakeLabel };

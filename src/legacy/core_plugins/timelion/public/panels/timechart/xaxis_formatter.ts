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

import moment from 'moment';

import { i18n } from '@kbn/i18n';

export function xaxisFormatterProvider(config: any) {
  function getFormat(esInterval: any) {
    const parts = esInterval.match(/(\d+)(ms|s|m|h|d|w|M|y|)/);

    if (parts == null || parts[1] == null || parts[2] == null) {
      throw new Error(
        i18n.translate('timelion.panels.timechart.unknownIntervalErrorMessage', {
          defaultMessage: 'Unknown interval',
        })
      );
    }

    const interval = moment.duration(Number(parts[1]), parts[2]);

    // Cribbed from Kibana's TimeBuckets class
    const rules = config.get('dateFormat:scaled');

    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i];
      if (!rule[0] || interval >= moment.duration(rule[0])) {
        return rule[1];
      }
    }

    return config.get('dateFormat');
  }

  return function(esInterval: any) {
    return getFormat(esInterval);
  };
}

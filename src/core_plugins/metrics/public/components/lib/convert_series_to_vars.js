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

import _ from 'lodash';
import getLastValue from '../../../common/get_last_value';
import tickFormatter from './tick_formatter';
import moment from 'moment';
export default (series, model, dateFormat = 'lll') => {
  const variables = {};
  model.series.forEach(seriesModel => {
    series
      .filter(row => _.startsWith(row.id, seriesModel.id))
      .forEach(row => {
        const varName = [
          _.snakeCase(row.label),
          _.snakeCase(seriesModel.var_name)
        ].filter(v => v).join('.');

        const formatter = tickFormatter(seriesModel.formatter, seriesModel.value_template);
        const lastValue = getLastValue(row.data);

        const data = {
          last: {
            raw: lastValue,
            formatted: formatter(lastValue)
          },
          data: {
            raw: row.data,
            formatted: row.data.map(point => {
              return [moment(point[0]).format(dateFormat), formatter(point[1])];
            })
          }
        };
        _.set(variables, varName, data);
        _.set(variables, `${_.snakeCase(row.label)}.label`, row.label);
      });
  });
  return variables;

};

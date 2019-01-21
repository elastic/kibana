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

import { uniq, forEach } from 'lodash';
import SearchStrategiesRegister from './search_strategies/search_strategies_register';

const FIELD_TYPES = {
  STRING: 'string',
  DATE: 'date',
  NUMBER: 'number'
};

const createField = (name, type) => ({
  name,
  type,
  aggregatable: true,
  searchable: true
});

export async function getFields(req) {
  const index = req.query.index || '*';
  const { capabilities } = await SearchStrategiesRegister.getViableStrategy(req, index);

  if (capabilities.fieldsCapabilities) {
    const fields = [];
    forEach(capabilities.fieldsCapabilities, (aggs, field) => {
      if (aggs[0].agg === 'terms') {
        fields.push(createField(field, FIELD_TYPES.STRING));
      } else if (aggs[0].agg === 'date_histogram') {
        fields.push(createField(field, FIELD_TYPES.DATE));
      } else {
        fields.push(createField(field, FIELD_TYPES.NUMBER));
      }
    });

    return fields;
  }

  const { indexPatternsService } = req.pre;
  const resp = await indexPatternsService.getFieldsForWildcard({ pattern: index });
  const fields = resp.filter(field => field.aggregatable);
  return uniq(fields, field => field.name);
}

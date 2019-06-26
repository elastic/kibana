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

import { each, reject } from 'lodash';

export function getComputedFields() {
  const self = this;
  const scriptFields = {};

  // Date value returned in "_source" could be in any number of formats
  // Use a docvalue for each date field to ensure standardized formats when working with date fields
  // indexPattern.flattenHit will override "_source" values when the same field is also defined in "fields"
  const docvalueFields = reject(self.fields.byType.date, 'scripted')
    .map((dateField) => {
      return {
        field: dateField.name,
        format: dateField.esTypes && dateField.esTypes.indexOf('date_nanos') !== -1 ? 'strict_date_time' : 'date_time',
      };
    });

  each(self.getScriptedFields(), function (field) {
    scriptFields[field.name] = {
      script: {
        source: field.script,
        lang: field.lang
      }
    };
  });

  return {
    storedFields: ['*'],
    scriptFields: scriptFields,
    docvalueFields: docvalueFields
  };

}

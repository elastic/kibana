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

export function createRelativeDateFormat(FieldFormat) {
  return class RelativeDateFormat extends FieldFormat {
    constructor(params) {
      super(params);
    }

    _convert(val) {
      if (val === null || val === undefined) {
        return '-';
      }

      const date = moment(val);
      if (date.isValid()) {
        return date.fromNow();
      } else {
        return val;
      }
    }

    static id = 'relative_date';
    static title = 'Relative Date';
    static fieldType = 'date';
  };
}

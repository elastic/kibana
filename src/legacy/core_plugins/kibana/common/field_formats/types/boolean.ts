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

import {
  FieldFormat,
  asPrettyString,
  KBN_FIELD_TYPES,
} from '../../../../../../plugins/data/common';

export function createBoolFormat() {
  return class BoolFormat extends FieldFormat {
    static id = 'boolean';
    static title = 'Boolean';
    static fieldType = [KBN_FIELD_TYPES.BOOLEAN, KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.STRING];

    _convert(value: any): string {
      if (typeof value === 'string') {
        value = value.trim().toLowerCase();
      }

      switch (value) {
        case false:
        case 0:
        case 'false':
        case 'no':
          return 'false';
        case true:
        case 1:
        case 'true':
        case 'yes':
          return 'true';
        default:
          return asPrettyString(value);
      }
    }
  };
}

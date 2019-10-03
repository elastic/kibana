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

import { trunc } from 'lodash';
import {
  FieldFormat,
  TEXT_CONTEXT_TYPE,
  KBN_FIELD_TYPES,
} from '../../../../../../plugins/data/common/';

const omission = '...';

export function createTruncateFormat() {
  class TruncateFormat extends FieldFormat {
    static id = 'truncate';
    static title = 'Truncated String';
    static fieldType = KBN_FIELD_TYPES.STRING;

    _convert = {
      [TEXT_CONTEXT_TYPE](this: TruncateFormat, val: any) {
        const length = this.param('fieldLength') as any;
        if (length > 0) {
          return trunc(val, {
            length: length + omission.length,
            omission,
          });
        }

        return val;
      },
    };
  }

  return TruncateFormat;
}

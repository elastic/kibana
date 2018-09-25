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

import { mapValues, keys } from 'lodash';
import { normalizeType } from '@kbn/interpreter/server';

export function getESFieldTypes(index, fields, elasticsearchClient) {
  const config = {
    index: index,
    fields: fields || '*',
  };

  if (fields && fields.length === 0) return Promise.resolve({});

  return elasticsearchClient('fieldCaps', config).then(resp => {
    return mapValues(resp.fields, types => {
      if (keys(types).length > 1) return 'conflict';

      try {
        return normalizeType(keys(types)[0]);
      } catch (e) {
        return 'unsupported';
      }
    });
  });
}

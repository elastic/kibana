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

import { mapValues, isString } from 'lodash';
import { ES_FIELD_TYPES } from '../../../../plugins/data/common';
import { FieldMappingSpec, MappingObject } from './types';

/** @private */
type ShorthandFieldMapObject = FieldMappingSpec | ES_FIELD_TYPES | 'json';

const json: FieldMappingSpec = {
  type: ES_FIELD_TYPES.TEXT,
  _serialize(v) {
    if (v) return JSON.stringify(v);
  },
  _deserialize(v) {
    if (v) return JSON.parse(v);
  },
};

/** @public */
export const expandShorthand = (sh: Record<string, ShorthandFieldMapObject>): MappingObject => {
  return mapValues<Record<string, ShorthandFieldMapObject>>(sh, (val: ShorthandFieldMapObject) => {
    const fieldMap = isString(val) ? { type: val } : val;

    return fieldMap.type === 'json' ? json : fieldMap;
  }) as MappingObject;
};

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

import { mapValues } from 'lodash';

const json = {
  _serialize: function (val) {
    if (val != null) return JSON.stringify(val);
  },
  _deserialize: function (val) {
    if (val != null) return JSON.parse(val);
  }
};

export const expandShorthand = function (sh) {
  return mapValues(sh || {}, function (val) {
    // allow shortcuts for the field types, by just setting the value
    // to the type name
    if (typeof val === 'string') val = { type: val };

    if (val.type === 'json') {
      val.type = 'text';
      val._serialize = json._serialize;
      val._deserialize = json._deserialize;
    }

    return val;
  });
};

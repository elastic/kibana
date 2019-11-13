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

//
// THIS IS A DIRECT COPY OF
// '../../../../../../../src/core/server/config/ensure_deep_object'
// BECAUSE THAT IS BLOCKED FOR IMPORTING BY OUR LINTER.
//
// IF THAT IS EXPOSED, WE SHOULD USE IT RATHER THAN CLONE IT.
//

const separator = '.';

/**
 * Recursively traverses through the object's properties and expands ones with
 * dot-separated names into nested objects (eg. { a.b: 'c'} -> { a: { b: 'c' }).
 * @param obj Object to traverse through.
 * @returns Same object instance with expanded properties.
 */
export function ensureDeepObject(obj: any): any {
  if (obj == null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => ensureDeepObject(item));
  }

  return Object.keys(obj).reduce((fullObject, propertyKey) => {
    const propertyValue = obj[propertyKey];
    if (!propertyKey.includes(separator)) {
      fullObject[propertyKey] = ensureDeepObject(propertyValue);
    } else {
      walk(fullObject, propertyKey.split(separator), propertyValue);
    }

    return fullObject;
  }, {} as any);
}

function walk(obj: any, keys: string[], value: any) {
  const key = keys.shift()!;
  if (keys.length === 0) {
    obj[key] = value;
    return;
  }

  if (obj[key] === undefined) {
    obj[key] = {};
  }

  walk(obj[key], keys, ensureDeepObject(value));
}

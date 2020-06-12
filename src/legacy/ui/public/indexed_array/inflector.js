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

function upFirst(str, total) {
  return str.charAt(0).toUpperCase() + (total ? str.substr(1).toLowerCase() : str.substr(1));
}

function startsWith(str, test) {
  return str.substr(0, test.length).toLowerCase() === test.toLowerCase();
}

function endsWith(str, test) {
  const tooShort = str.length < test.length;
  if (tooShort) return;

  return str.substr(str.length - test.length).toLowerCase() === test.toLowerCase();
}

export function inflector(prefix, postfix) {
  return function inflect(key) {
    let inflected;

    if (key.indexOf('.') !== -1) {
      inflected = key
        .split('.')
        .map(function (step, i) {
          return i === 0 ? step : upFirst(step, true);
        })
        .join('');
    } else {
      inflected = key;
    }

    if (prefix && !startsWith(key, prefix)) {
      inflected = prefix + upFirst(inflected);
    }

    if (postfix && !endsWith(key, postfix)) {
      inflected = inflected + postfix;
    }

    return inflected;
  };
}

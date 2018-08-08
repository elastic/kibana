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

import { isArray, isPlainObject, forOwn, set, transform, isString } from 'lodash';
import { readFileSync as read } from 'fs';
import { safeLoad } from 'js-yaml';

function replaceEnvVarRefs(val) {
  return val.replace(/\$\{(\w+)\}/g, (match, envVarName) => {
    if (process.env[envVarName] !== undefined) {
      return process.env[envVarName];
    } else {
      throw new Error(`Unknown environment variable referenced in config : ${envVarName}`);
    }
  });
}

export function merge(sources) {
  return transform(sources, (merged, source) => {
    forOwn(source, function apply(val, key) {
      if (isPlainObject(val)) {
        forOwn(val, function (subVal, subKey) {
          apply(subVal, key + '.' + subKey);
        });
        return;
      }

      if (isArray(val)) {
        set(merged, key, []);
        val.forEach((subVal, i) => apply(subVal, key + '.' + i));
        return;
      }

      if (isString(val)) {
        val = replaceEnvVarRefs(val);
      }

      set(merged, key, val);
    });
  }, {});
}

export function readYamlConfig(paths) {
  const files = [].concat(paths || []);
  const yamls = files.map(path => safeLoad(read(path, 'utf8')));
  return merge(yamls);
}

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

import { intersects, coerce } from 'semver';
import { get } from 'lodash';

export function versionsMatch(a, b, precision) {
  if (precision === 'off') return true;

  const parsedA = get(coerce(a), 'version', null);
  const parsedB = get(coerce(b), 'version', null);
  if (!(parsedA && parsedB)) return false;

  switch (precision) {
    case 'major':
      return intersects(`^${parsedA}`, `^${parsedB}`);
    case 'minor':
      return intersects(`~${parsedA}`, `~${parsedB}`);
    case 'patch':
      return intersects(parsedA, parsedB);
    case 'exact':
      return a === b;
    default:
      throw new Error('unexpected precision');
  }
}


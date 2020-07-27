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

import { pretty } from '../code_coverage/ingest_coverage/utils';

export function teamName(githubHandle) {
  const prefix = /elastic\//;
  const dropElastic = dropPrefix(prefix);
  const prefixedWithES = prefixed(prefix);

  return prefixedWithES(githubHandle) ? dropElastic(githubHandle) : githubHandle;
}

export function hasPath(path) {
  return (iterable) => !!iterable.has(path);
}

function prefixed(prefix) {
  return (x) => prefix.test(x);
}

function dropPrefix(prefix) {
  return (x) => x.replace(prefix, '');
}
export function hasOverrides(xs) {
  return !!Array.isArray(xs[0]);
}

export function printMap(map) {
  map.forEach((value, key) => console.log(key + ' -> ' + pretty(value)));
}

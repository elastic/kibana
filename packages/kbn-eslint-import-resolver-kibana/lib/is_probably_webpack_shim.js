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

const { readdirSync } = require('fs');
const { join, dirname } = require('path');

const LRU = require('lru-cache');

const { isDirectory } = require('./get_path_type');

const cache = process.env.KIBANA_RESOLVER_HARD_CACHE ? new Map() : new LRU({ max: 1000 });

function readShimNames(shimDirectory) {
  if (!isDirectory(shimDirectory)) {
    return [];
  }

  return readdirSync(shimDirectory)
    .filter(name => !name.startsWith('.') && !name.startsWith('_'))
    .map(name => (name.endsWith('.js') ? name.slice(0, -3) : name));
}

function findRelativeWebpackShims(directory) {
  const cached = cache.get(directory);
  if (cached) {
    return cached;
  }

  const ownShims = readShimNames(join(directory, 'webpackShims'));

  const parent = dirname(directory);
  const parentShims = parent !== directory ? findRelativeWebpackShims(parent) : [];

  const allShims = !ownShims.length ? parentShims : ownShims.concat(parentShims);

  cache.set(directory, allShims);
  return allShims;
}

exports.isProbablyWebpackShim = function(source, file) {
  const shims = findRelativeWebpackShims(dirname(file));
  return shims.some(shim => source === shim || source.startsWith(shim + '/'));
};

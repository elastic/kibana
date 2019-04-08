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

const { statSync } = require('fs');

const LRU = require('lru-cache');

const DIR = Symbol('dir');
const FILE = Symbol('file');
const cache = process.env.KIBANA_RESOLVER_HARD_CACHE ? new Map() : new LRU({ maxAge: 1000 });

function getPathType(path) {
  const cached = cache.get(path);
  if (cached !== undefined) {
    return cached;
  }

  let type = null;
  try {
    const stats = statSync(path);
    if (stats.isDirectory()) {
      type = DIR;
    } else if (stats.isFile() || stats.isFIFO()) {
      type = FILE;
    }
  } catch (error) {
    if (!error || (error.code !== 'ENOENT' && error.code !== 'ENOTDIR')) {
      throw error;
    }
  }

  cache.set(path, type);
  return type;
}

exports.isDirectory = function(path) {
  return getPathType(path) === DIR;
};

exports.isFile = function(path) {
  return getPathType(path) === FILE;
};

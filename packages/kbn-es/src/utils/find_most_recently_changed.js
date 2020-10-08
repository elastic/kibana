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

const path = require('path');
const fs = require('fs');
const glob = require('glob');

/**
 *  Find the most recently modified file that matches the pattern pattern
 *
 *  @param  {String} pattern absolute path with glob expressions
 *  @return {String} Absolute path
 */
exports.findMostRecentlyChanged = function findMostRecentlyChanged(pattern) {
  if (!path.isAbsolute(pattern)) {
    throw new TypeError(`Pattern must be absolute, got ${pattern}`);
  }

  const ctime = (path) => fs.statSync(path).ctime.getTime();

  return glob
    .sync(pattern)
    .sort((a, b) => ctime(a) - ctime(b))
    .pop();
};

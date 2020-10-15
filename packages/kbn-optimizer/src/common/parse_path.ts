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

import normalizePath from 'normalize-path';
import Qs from 'querystring';

/**
 * Parse an absolute path, supporting normalized paths from webpack,
 * into a list of directories and root
 */
export function parseDirPath(path: string) {
  const filePath = parseFilePath(path);
  return {
    ...filePath,
    dirs: [...filePath.dirs, ...(filePath.filename ? [filePath.filename] : [])],
    filename: undefined,
  };
}

export function parseFilePath(path: string) {
  let normalized = normalizePath(path);
  let query;
  const queryIndex = normalized.indexOf('?');
  if (queryIndex !== -1) {
    query = Qs.parse(normalized.slice(queryIndex + 1));
    normalized = normalized.slice(0, queryIndex);
  }

  const [root, ...others] = normalized.split('/');
  return {
    root: root === '' ? '/' : root,
    dirs: others.slice(0, -1),
    query,
    filename: others[others.length - 1] || undefined,
  };
}

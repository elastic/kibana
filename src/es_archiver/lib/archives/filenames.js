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

import { basename, extname } from 'path';

export function isGzip(path) {
  return extname(path) === '.gz';
}

/**
 *  Check if a path is for a, potentially gzipped, mapping file
 *  @param  {String} path
 *  @return {Boolean}
 */
export function isMappingFile(path) {
  return basename(path, '.gz') === 'mappings.json';
}

/**
 *  Sorts the filenames found in an archive so that
 *  "mappings" files come first, which is the order they
 *  need to be imported so that data files will have their
 *  indexes before the docs are indexed.
 *
 *  @param {Array<String>} filenames
 *  @return {Array<String>}
 */
export function prioritizeMappings(filenames) {
  return filenames.slice().sort((fa, fb) => {
    if (isMappingFile(fa) === isMappingFile(fb)) return 0;
    return isMappingFile(fb) ? 1 : -1;
  });
}

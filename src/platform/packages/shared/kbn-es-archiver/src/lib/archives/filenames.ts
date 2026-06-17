/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { basename, extname } from 'path';

export function isGzip(path: string) {
  return extname(path) === '.gz';
}

/**
 *  Check if a path is for a, potentially gzipped, mapping file
 *  @param  {String} path
 *  @return {Boolean}
 */
export function isMappingFile(path: string) {
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
export function prioritizeMappings(filenames: string[]) {
  return filenames.slice().sort((fa, fb) => {
    if (isMappingFile(fa) === isMappingFile(fb)) return 0;
    return isMappingFile(fb) ? 1 : -1;
  });
}

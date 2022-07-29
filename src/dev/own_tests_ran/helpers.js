/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/utils';

const resolveRoot = resolve.bind(null, REPO_ROOT);
const testDirectories = (testRootsPath) =>
  yaml.load(readFileSync(resolveRoot(testRootsPath), 'utf8')).general;

export const testDirectoryRegexes = (testRootsPath) =>
  testDirectories(testRootsPath).map((x) => new RegExp(x));

export const isTest = (regexes) => (filePath) => regexes.some((re) => re.test(filePath));

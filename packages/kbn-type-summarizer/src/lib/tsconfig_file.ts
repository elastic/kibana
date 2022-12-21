/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';

import { CliError, Path } from '@kbn/type-summarizer-core';

/**
 * Read TS's special variable of JSON from a file into a plain object
 */
function readTsConfigFile(path: string) {
  const json = ts.readConfigFile(path, ts.sys.readFile);

  if (json.error) {
    throw new CliError(`Unable to load tsconfig file: ${json.error.messageText}`);
  }

  return json.config;
}

/**
 * Read a tsconfig.json file from dist and parse it using utilities from the typscript package.
 */
export function loadTsConfigFile(path: string) {
  return ts.parseJsonConfigFileContent(readTsConfigFile(path) ?? {}, ts.sys, Path.dirname(path));
}

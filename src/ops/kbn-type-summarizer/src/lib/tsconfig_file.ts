/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';

import * as Path from './path';
import { CliError } from './cli_error';

export function readTsConfigFile(path: string) {
  const json = ts.readConfigFile(path, ts.sys.readFile);

  if (json.error) {
    throw new CliError(`Unable to load tsconfig file: ${json.error.messageText}`);
  }

  return json.config;
}

export function loadTsConfigFile(path: string) {
  return ts.parseJsonConfigFileContent(readTsConfigFile(path) ?? {}, ts.sys, Path.dirname(path));
}

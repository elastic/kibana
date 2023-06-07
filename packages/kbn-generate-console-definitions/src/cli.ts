/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-cli-runner';
import { kbnGenerateConsoleDefinitions } from './generate_console_definitions';

export function runGenerateConsoleDefinitionsCli() {
  run((context) => {
    const { log } = context;
    log.info('starting console definitions generation');
    kbnGenerateConsoleDefinitions();
    log.info('completed console definitions generation');
  });
}

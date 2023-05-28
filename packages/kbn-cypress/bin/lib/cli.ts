/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Debug from 'debug';
import { CurrentsRunParameters, TestingType } from '../../types';
import { sanitizeAndConvertNestedArgs } from './parser';
import { program } from './program';

const debug = Debug('currents:cli');

export function parseCLIOptions(
  _program: typeof program = program,
  ...args: Parameters<typeof program.parse>
) {
  _program.parse(...args);
  debug('parsed CLI flags %o', _program.opts());

  const { e2e, component } = _program.opts();
  if (e2e && component) {
    _program.error('Cannot use both e2e and component options');
  }

  return getRunParametersFromCLI(_program.opts());
}

/**
 * Transforms the CLI options into the format that the `run` API expects
 *
 * @param cliOptions
 * @returns Currents run parameters
 */
export function getRunParametersFromCLI(
  cliOptions: ReturnType<typeof program.opts>
): CurrentsRunParameters {
  const { component, e2e, ...restOptions } = cliOptions;
  const testingType: TestingType = component ? 'component' : 'e2e';

  const result: Partial<CurrentsRunParameters> = {
    ...restOptions,
    config: sanitizeAndConvertNestedArgs(cliOptions.config, 'config'),
    env: sanitizeAndConvertNestedArgs(cliOptions.env, 'env'),
    reporterOptions: sanitizeAndConvertNestedArgs(cliOptions.reporterOptions, 'reporterOptions'),
    testingType,
    recordKey: cliOptions.key,
  };

  debug('parsed run params: %o', result);
  return result;
}

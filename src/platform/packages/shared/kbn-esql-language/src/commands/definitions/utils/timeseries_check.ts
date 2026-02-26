/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstCommand } from '../../../types';
import { esqlCommandRegistry } from '../../registry';

let _sourceCommandNames: Set<string> | undefined;
let _timeseriesCommandNames: Set<string> | undefined;

const initialize = () => {
  if (!_sourceCommandNames) {
    _sourceCommandNames = new Set(esqlCommandRegistry.getSourceCommandNames());
    _timeseriesCommandNames = new Set(esqlCommandRegistry.getTimeseriesCommandNames());
  }
};

const findSourceCommand = (ast: ESQLAstCommand[]) => {
  initialize();
  return ast.find((cmd) => _sourceCommandNames!.has(cmd.name));
};

/**
 * Checks if the source command in the AST is a timeseries command (e.g. TS).
 * Finds the source command dynamically rather than assuming it's at index 0.
 */
export const isTimeseriesSourceCommand = (ast: ESQLAstCommand[]): boolean => {
  const sourceCommand = findSourceCommand(ast);
  return sourceCommand ? _timeseriesCommandNames!.has(sourceCommand.name) : false;
};

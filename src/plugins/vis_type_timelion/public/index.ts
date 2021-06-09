/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/public';
import { TimelionVisPlugin as Plugin } from './plugin';

import { tickFormatters } from './legacy/tick_formatters';
import { getTimezone } from './helpers/get_timezone';
import { xaxisFormatterProvider } from './helpers/xaxis_formatter';
import { generateTicksProvider } from './helpers/tick_generator';
import { DEFAULT_TIME_FORMAT, calculateInterval } from '../common/lib';
import { parseTimelionExpressionAsync } from '../common/parser_async';

export function plugin(initializerContext: PluginInitializerContext) {
  return new Plugin(initializerContext);
}

// This export should be removed on removing Timeline APP
export const _LEGACY_ = {
  DEFAULT_TIME_FORMAT,
  calculateInterval,
  parseTimelionExpressionAsync,
  tickFormatters,
  getTimezone,
  xaxisFormatterProvider,
  generateTicksProvider,
};

export { VisTypeTimelionPluginStart, VisTypeTimelionPluginSetup } from './plugin';

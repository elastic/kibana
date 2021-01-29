/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/public';
import { TimelionVisPlugin as Plugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new Plugin(initializerContext);
}

export { getTimezone } from './helpers/get_timezone';
export { tickFormatters } from './helpers/tick_formatters';
export { xaxisFormatterProvider } from './helpers/xaxis_formatter';
export { generateTicksProvider } from './helpers/tick_generator';

export { DEFAULT_TIME_FORMAT, calculateInterval } from '../common/lib';

export { VisTypeTimelionPluginStart, VisTypeTimelionPluginSetup } from './plugin';

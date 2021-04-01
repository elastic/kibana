/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// DRAFT PR bundle size experiment
export type { TopLevelSpec } from 'vega-lite';
import { compile } from 'vega-lite';
import { parse, View, Warn } from 'vega';
import { Handler } from 'vega-tooltip';

import { PluginInitializerContext } from 'kibana/public';
import { ConfigSchema } from '../config';
import { VegaPlugin as Plugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  return new Plugin(initializerContext);
}

// DRAFT PR bundle size experiment
export const mlDraftExport = {
  compile,
  parse,
  View,
  Warn,
  Handler,
};

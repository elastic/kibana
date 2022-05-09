/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Rename PluginStart to something better
import { PluginSetup, PluginStart } from '@kbn/data-plugin/server';

export interface SearchExamplesPluginSetupDeps {
  data: PluginSetup;
}

export interface SearchExamplesPluginStartDeps {
  data: PluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchExamplesPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchExamplesPluginStart {}

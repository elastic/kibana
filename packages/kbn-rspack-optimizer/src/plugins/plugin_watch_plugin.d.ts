/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Compiler } from '@rspack/core';
import type { SingleCompileConfigOptions } from '../config/create_single_compile_config';
/**
 * RSPack plugin that watches for plugin changes (kibana.jsonc files)
 * and triggers a rebuild when plugins are added or removed.
 */
export declare class PluginWatchPlugin {
  private pluginManifests;
  private options;
  private wrapperDir;
  private lastPluginHash;
  private hasInitialDiscovery;
  constructor(pluginManifests: string[], options: SingleCompileConfigOptions, wrapperDir: string);
  private shouldRediscoverPlugins;
  apply(compiler: Compiler): void;
}

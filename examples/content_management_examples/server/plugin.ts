/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SetupDeps, StartDeps } from './types';
import { registerTodoContentType } from './examples/todos';

export class ContentManagementExamplesPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { contentManagement }: SetupDeps) {
    registerTodoContentType({ contentManagement });
    return {};
  }

  public start(core: CoreStart, { contentManagement }: StartDeps) {
    return {};
  }

  public stop() {}
}

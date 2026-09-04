/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';

import { OPERATION_TYPE } from '../common/constants';
import { createSpaceIdGetter, registerRoutes } from './routes';
import { saExampleJobType } from './saved_object';

interface SetupDeps {
  spaces?: SpacesPluginSetup;
}

export class ServiceAccountsExamplePlugin implements Plugin<void, void, SetupDeps> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { spaces }: SetupDeps) {
    core.savedObjects.registerType(saExampleJobType);

    const operationHandle = core.security.serviceAccounts.registerOperation({
      type: OPERATION_TYPE,
    });

    registerRoutes({
      router: core.http.createRouter(),
      getStartServices: core.getStartServices,
      operationHandle,
      logger: this.initializerContext.logger.get(),
      getSpaceId: createSpaceIdGetter(spaces),
    });
  }

  public start() {}

  public stop() {}
}

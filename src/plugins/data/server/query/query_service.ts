/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from 'kibana/server';
import { querySavedObjectType } from '../saved_objects';
import { extract, getAllMigrations, inject, telemetry } from '../../common/query/persistable_state';
import { registerSavedQueryRoutes } from './routes';
import {
  registerSavedQueryRouteHandlerContext,
  SavedQueryRouteHandlerContext,
} from './route_handler_context';

export class QueryService implements Plugin<void> {
  public setup(core: CoreSetup) {
    core.savedObjects.registerType(querySavedObjectType);
    core.http.registerRouteHandlerContext<SavedQueryRouteHandlerContext, 'savedQuery'>(
      'savedQuery',
      registerSavedQueryRouteHandlerContext
    );
    registerSavedQueryRoutes(core);

    return {
      filterManager: {
        extract,
        inject,
        telemetry,
        getAllMigrations,
      },
    };
  }

  public start() {}
}

/** @public */
export type QuerySetup = ReturnType<QueryService['setup']>;

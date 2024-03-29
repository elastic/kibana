/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from '@kbn/core/server';
import type { Filter } from '@kbn/es-query';
import { PersistableStateService } from '@kbn/kibana-utils-plugin/common';
import { querySavedObjectType } from '../saved_objects';
import * as queryPersistableState from '../../common/query/persistable_state';
import * as filtersPersistableState from '../../common/query/filters/persistable_state';
import { registerSavedQueryRoutes } from './routes';
import {
  registerSavedQueryRouteHandlerContext,
  SavedQueryRouteHandlerContext,
} from './route_handler_context';
import { QueryState } from '../../common';

export interface QuerySetup extends PersistableStateService<QueryState> {
  filterManager: PersistableStateService<Filter[]>;
}

/**
 * @internal
 */
export class QueryService implements Plugin<void> {
  public setup(core: CoreSetup): QuerySetup {
    core.savedObjects.registerType(querySavedObjectType);
    core.http.registerRouteHandlerContext<SavedQueryRouteHandlerContext, 'savedQuery'>(
      'savedQuery',
      registerSavedQueryRouteHandlerContext
    );
    registerSavedQueryRoutes(core);

    return {
      extract: queryPersistableState.extract,
      inject: queryPersistableState.inject,
      telemetry: queryPersistableState.telemetry,
      getAllMigrations: queryPersistableState.getAllMigrations,
      filterManager: {
        extract: filtersPersistableState.extract,
        inject: filtersPersistableState.inject,
        telemetry: filtersPersistableState.telemetry,
        getAllMigrations: filtersPersistableState.getAllMigrations,
      },
    };
  }

  public start() {}
}

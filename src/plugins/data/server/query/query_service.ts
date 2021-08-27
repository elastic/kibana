/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreSetup } from '../../../../core/server';
import type { Plugin } from '../../../../core/server/plugins/types';
import {
  extract,
  getAllMigrations,
  inject,
  migrateToLatest,
  telemetry,
} from '../../common/query/persistable_state';
import { querySavedObjectType } from '../saved_objects/query';

export class QueryService implements Plugin<void> {
  public setup(core: CoreSetup) {
    core.savedObjects.registerType(querySavedObjectType);

    return {
      filterManager: {
        extract,
        inject,
        telemetry,
        migrateToLatest,
        getAllMigrations,
      },
    };
  }

  public start() {}
}

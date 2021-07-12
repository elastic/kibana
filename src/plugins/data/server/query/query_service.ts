/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from 'kibana/server';
import { querySavedObjectType } from '../saved_objects';
import {
  extract,
  inject,
  telemetry,
  migrateToLatest,
  getAllMigrations,
} from '../../common/query/persistable_state';

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

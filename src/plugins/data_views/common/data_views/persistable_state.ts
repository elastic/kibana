/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewBaseSerializable } from '@kbn/es-query';
import { PersistableStateService } from '@kbn/kibana-utils-plugin/common';

export const DataViewPersistableStateService: PersistableStateService<DataViewBaseSerializable> = {
  inject: (state, references) => {
    return state;
  },
  extract: (state) => {
    return { state, references: [] };
  },
  getAllMigrations: () => ({}),
  migrateToLatest: ({ state }) => state,
  telemetry: () => ({}),
};

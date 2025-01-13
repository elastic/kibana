/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PersistableStateService } from '@kbn/kibana-utils-plugin/common';
import { DataViewSpec } from '../types';

export const DataViewPersistableStateService: PersistableStateService<DataViewSpec> = {
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createInitialState } from './create_initial_state';
import { createContextMock, createMigrationConfigMock } from '../test_helpers';

describe('createInitialState', () => {
  test('`skipDocumentMigration` is `false` if the node has the `migrator` role', () => {
    const context = createContextMock({
      nodeRoles: { backgroundTasks: false, ui: false, migrator: true },
    });
    const state = createInitialState(context);
    expect(state.skipDocumentMigration).toEqual(false);
  });
  test('`skipDocumentMigration` is `true` if the node does not have the `migrator` role', () => {
    const context = createContextMock({
      nodeRoles: { backgroundTasks: true, ui: true, migrator: false },
    });
    const state = createInitialState(context);
    expect(state.skipDocumentMigration).toEqual(true);
  });
  test('`skipDocumentMigration` is `false` if the node does not have the `migrator` role but `runOnNonMigratorNodes` is true', () => {
    const context = createContextMock({
      migrationConfig: createMigrationConfigMock({
        zdt: {
          metaPickupSyncDelaySec: 120,
          runOnNonMigratorNodes: true,
        },
      }),
      nodeRoles: { backgroundTasks: false, ui: false, migrator: false },
    });
    const state = createInitialState(context);
    expect(state.skipDocumentMigration).toEqual(false);
  });
});

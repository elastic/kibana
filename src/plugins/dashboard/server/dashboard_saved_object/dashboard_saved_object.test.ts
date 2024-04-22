/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createModelVersionTestMigrator,
  type ModelVersionTestMigrator,
} from '@kbn/core-test-helpers-model-versions';
import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';

import { createDashboardSavedObjectType } from './dashboard_saved_object';

const embeddableSetupMock = createEmbeddableSetupMock();

describe('dashboard saved object model version transformations', () => {
  let migrator: ModelVersionTestMigrator;

  beforeEach(() => {
    migrator = createModelVersionTestMigrator({
      type: createDashboardSavedObjectType({ migrationDeps: { embeddable: embeddableSetupMock } }),
    });
  });

  describe('model version 2', () => {
    const dashboard = {
      id: 'some-id',
      type: 'dashboard',
      attributes: {
        title: 'Some Title',
        description: 'some description',
        panelsJSON: 'some panels',
        kibanaSavedObjectMeta: {},
        optionsJSON: 'some options',
        controlGroupInput: {},
      },
      references: [],
    };

    it('should properly remove the controlGroupInput.showApplySelections field when converting from v2 to v1', () => {
      const migrated = migrator.migrate({
        document: {
          ...dashboard,
          attributes: {
            ...dashboard.attributes,
            controlGroupInput: { showApplySelections: false },
          },
        },
        fromVersion: 2,
        toVersion: 1,
      });

      expect(migrated.attributes).toEqual(dashboard.attributes);
    });
  });
});

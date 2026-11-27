/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { deriveMigrationInputs } from './context';

describe('deriveMigrationInputs', () => {
  const allRoles = { ui: true, backgroundTasks: true, migrator: false };
  const runOnRoles = ['migrator'];

  describe('on classic deployments', () => {
    const classic = { esCapabilities: { serverless: false }, nodeRoles: allRoles, runOnRoles };

    it('fails on downgrades, fences off previous versions and checks the cluster', () => {
      expect(deriveMigrationInputs({ ...classic, waitForMigrationCompletion: false })).toEqual({
        allowDowngrade: false,
        removeOutdatedVersionAliases: true,
        checkClusterRoutingAllocation: true,
        fetchAllocationExplain: true,
        waitForMigrationCompletion: false,
        migrateDocuments: true,
        pickupUpdatedMappings: true,
      });
    });

    it('lets background-tasks-only nodes wait for the migration, without converting documents', () => {
      expect(deriveMigrationInputs({ ...classic, waitForMigrationCompletion: true })).toMatchObject(
        { waitForMigrationCompletion: true, migrateDocuments: false }
      );
    });
  });

  describe('on serverless', () => {
    const serverless = {
      esCapabilities: { serverless: true },
      waitForMigrationCompletion: true,
      runOnRoles,
    };

    it('accepts rollbacks, keeps previous version aliases and never waits', () => {
      expect(deriveMigrationInputs({ ...serverless, nodeRoles: allRoles })).toEqual({
        allowDowngrade: true,
        removeOutdatedVersionAliases: false,
        checkClusterRoutingAllocation: false,
        fetchAllocationExplain: false,
        waitForMigrationCompletion: false,
        migrateDocuments: false,
        pickupUpdatedMappings: true,
      });
    });

    it('converts documents on the nodes with one of the configured roles', () => {
      expect(
        deriveMigrationInputs({
          ...serverless,
          nodeRoles: { ui: false, backgroundTasks: false, migrator: true },
        }).migrateDocuments
      ).toBe(true);
    });
  });
});

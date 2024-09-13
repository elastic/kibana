/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NodeRoles } from '@kbn/core-node-server';
import type { InitState, State } from './types';
import type { MigratorContext } from '../context';

/**
 * Create the initial state to be used for the ZDT migrator.
 */
export const createInitialState = (context: MigratorContext): State => {
  const nodeRoles = getNodeRoles(context.nodeRoles);
  const enabledRoles = new Set(context.migrationConfig.zdt.runOnRoles);
  const runDocumentMigration = nodeRoles.some((role) => enabledRoles.has(role));

  const initialState: InitState = {
    controlState: 'INIT',
    logs: [],
    retryCount: 0,
    retryDelay: 0,
    skipDocumentMigration: !runDocumentMigration,
  };
  return initialState;
};

const getNodeRoles = (roles: NodeRoles): string[] => {
  return Object.entries(roles)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key);
};

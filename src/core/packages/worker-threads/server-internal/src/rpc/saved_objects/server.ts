/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { rpcify } from '../core/rpcify';
import { RPCServerOf, RepositoryOf } from '../core/types';

export const createSavedObjectsRpcServer = (savedObjectsClient: SavedObjectsClientContract) => {
  return rpcify(savedObjectsClient, {
    bulkCreate: true,
    bulkDelete: true,
    bulkGet: true,
    bulkResolve: true,
    bulkUpdate: true,
    checkConflicts: true,
    closePointInTime: true,
    collectMultiNamespaceReferences: true,
    create: true,
    delete: true,
    find: true,
    get: true,
    openPointInTimeForType: true,
    removeReferencesTo: true,
    resolve: true,
    update: true,
    updateObjectsSpaces: true,
  });
};

export type SavedObjectsRPCServer = RPCServerOf<SavedObjectsClientContract>;
export type SavedObjectsRPCRepository = RepositoryOf<SavedObjectsRPCServer>;

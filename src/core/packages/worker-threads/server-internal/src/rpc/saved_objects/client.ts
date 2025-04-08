/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { MessagePort } from 'worker_threads';
import { Logger } from '@kbn/logging';
import { client } from '../core/client';
import { SavedObjectsRPCRepository } from './server';

export interface WorkerThreadsSavedObjectsClient extends SavedObjectsClientContract {
  destroy(): void;
}

export function WorkerThreadsSavedObjectsClient(
  port: MessagePort,
  defaults: {
    namespace?: string;
  },
  logger: Logger
): WorkerThreadsSavedObjectsClient {
  const rpcClient = client<SavedObjectsRPCRepository>(
    port,
    {
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
    },
    logger
  );

  function createThrow(method: string): any {
    return () => {
      throw new Error(`Method ${method} not available in worker thread`);
    };
  }

  const that: WorkerThreadsSavedObjectsClient = {
    ...rpcClient.api,
    asScopedToNamespace: createThrow('asScopedToNamespace'),
    createPointInTimeFinder: createThrow('createPointInTimeFinder'),
    getCurrentNamespace: () => {
      return defaults.namespace;
    },
    destroy() {
      rpcClient.destroy();
    },
  };

  return that;
}

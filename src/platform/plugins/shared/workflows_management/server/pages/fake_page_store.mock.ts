/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowPageAttributes } from './page_saved_object';
import { getWorkflowPageSavedObjectId, WORKFLOW_PAGE_SAVED_OBJECT_TYPE } from './page_saved_object';
import type { WorkflowPageRef } from './page_secret';

type StoredPage = SavedObject<WorkflowPageAttributes> & { namespace?: string };

/**
 * An in-memory store with the saved objects behavior the service relies on:
 * namespaces, `overwrite: false` conflicts, `version` checks, and `updated_by`.
 */
export const createFakeStore = () => {
  const docs = new Map<string, StoredPage>();
  let versionCounter = 0;
  const nextVersion = () => `v${++versionCounter}`;
  const key = (id: string, namespace?: string) => `${namespace ?? 'default'}:${id}`;
  const notFound = (id: string) =>
    SavedObjectsErrorHelpers.createGenericNotFoundError(WORKFLOW_PAGE_SAVED_OBJECT_TYPE, id);
  // The standard client strips encrypted attributes.
  const strip = ({ attributes, namespace, ...rest }: StoredPage) => {
    const { secret, ...visible } = attributes;
    return { ...rest, attributes: visible as WorkflowPageAttributes };
  };

  const createClient = (user?: string, denied = false) =>
    ({
      get: jest.fn(async (_type: string, id: string, options?: { namespace?: string }) => {
        if (denied) throw SavedObjectsErrorHelpers.decorateForbiddenError(new Error('forbidden'));
        const doc = docs.get(key(id, options?.namespace));
        if (!doc) throw notFound(id);
        return strip(doc);
      }),
      create: jest.fn(
        async (
          type: string,
          attributes: WorkflowPageAttributes,
          options: { id: string; namespace?: string; overwrite?: boolean }
        ) => {
          if (denied) throw SavedObjectsErrorHelpers.decorateForbiddenError(new Error('forbidden'));
          const k = key(options.id, options.namespace);
          if (docs.has(k) && !options.overwrite) {
            throw SavedObjectsErrorHelpers.createConflictError(type, options.id);
          }
          const now = new Date().toISOString();
          const doc: StoredPage = {
            id: options.id,
            type,
            attributes,
            references: [],
            namespace: options.namespace,
            version: nextVersion(),
            created_at: now,
            created_by: user,
            updated_at: now,
            updated_by: user,
          };
          docs.set(k, doc);
          return strip(doc);
        }
      ),
      update: jest.fn(
        async (
          _type: string,
          id: string,
          attributes: Partial<WorkflowPageAttributes>,
          options?: { namespace?: string; version?: string }
        ) => {
          if (denied) throw SavedObjectsErrorHelpers.decorateForbiddenError(new Error('forbidden'));
          const k = key(id, options?.namespace);
          const doc = docs.get(k);
          if (!doc) throw notFound(id);
          if (options?.version && options.version !== doc.version) {
            throw SavedObjectsErrorHelpers.createConflictError(WORKFLOW_PAGE_SAVED_OBJECT_TYPE, id);
          }
          docs.set(k, {
            ...doc,
            attributes: { ...doc.attributes, ...attributes },
            version: nextVersion(),
            updated_by: user,
          });
          return { id, type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE, attributes, references: [] };
        }
      ),
      bulkDelete: jest.fn(
        async (objects: Array<{ id: string }>, options?: { namespace?: string }) => ({
          statuses: objects.map(({ id }) => {
            const existed = docs.delete(key(id, options?.namespace));
            return existed
              ? { id, type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE, success: true }
              : {
                  id,
                  type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
                  success: false,
                  error: { error: 'Not Found', message: 'Not found', statusCode: 404 },
                };
          }),
        })
      ),
      createPointInTimeFinder: jest.fn((options: { namespaces: string[]; filter: unknown }) => {
        const filterText = JSON.stringify(options.filter);
        const matches = [...docs.values()].filter(
          (doc) =>
            (doc.namespace ?? 'default') === options.namespaces[0] &&
            filterText.includes(`"${doc.attributes.workflowId}"`)
        );
        return {
          find: async function* find() {
            yield { saved_objects: matches.map(strip), total: matches.length };
          },
          close: jest.fn(async () => {}),
        };
      }),
    } as unknown as jest.Mocked<SavedObjectsClientContract>);

  const encryptedClient = {
    getDecryptedAsInternalUser: jest.fn(
      async (_type: string, id: string, options?: { namespace?: string }) => {
        const doc = docs.get(key(id, options?.namespace));
        if (!doc) throw notFound(id);
        return { ...doc };
      }
    ),
  } as unknown as jest.Mocked<EncryptedSavedObjectsClient>;

  return { docs, createClient, encryptedClient, key };
};

export const pageDefinition = (pageId?: string) =>
  ({
    triggers: [{ type: 'page', title: 'Report', ...(pageId ? { id: pageId } : {}) }],
    steps: [],
  } as unknown as WorkflowYaml);

export const noPageDefinition = {
  triggers: [{ type: 'manual' }],
  steps: [],
} as unknown as WorkflowYaml;

export const pageRef: WorkflowPageRef = {
  workflowId: 'workflow-1',
  spaceId: 'default',
  pageId: 'default',
};

export const getStoredPage = (
  store: ReturnType<typeof createFakeStore>,
  ref: WorkflowPageRef = pageRef
) => store.docs.get(store.key(getWorkflowPageSavedObjectId(ref), undefined));

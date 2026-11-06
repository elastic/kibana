/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers, SavedObjectsUtils } from '@kbn/core/server';
import { getWorkflowPageSavedObjectId, WORKFLOW_PAGE_SAVED_OBJECT_TYPE } from './page_saved_object';
import type { WorkflowPageAttributes } from './page_saved_object';
import type { WorkflowPageRef } from './page_secret';
import type { WorkflowPageDto } from './types';
import { WorkflowPageNotFoundError } from './workflow_page_not_found_error';

export const namespaceOf = (spaceId: string): string | undefined =>
  SavedObjectsUtils.namespaceStringToId(spaceId);

/** A page is online with an encryption key, an access level, and no offline flag. */
export const isPageOnline = (attributes: WorkflowPageAttributes, canEncrypt: boolean): boolean =>
  canEncrypt && !attributes.offline && attributes.access != null;

/** Reads a page, or returns `undefined` when it does not exist. */
export const getPageOrUndefined = async (
  client: SavedObjectsClientContract,
  ref: WorkflowPageRef
): Promise<SavedObject<WorkflowPageAttributes> | undefined> => {
  try {
    return await client.get<WorkflowPageAttributes>(
      WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
      getWorkflowPageSavedObjectId(ref),
      { namespace: namespaceOf(ref.spaceId) }
    );
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};

export const toPageDto = (
  {
    attributes,
    created_at: createdAt,
    created_by: createdBy,
    updated_at: updatedAt,
    updated_by: updatedBy,
  }: SavedObject<WorkflowPageAttributes>,
  canEncrypt: boolean
): WorkflowPageDto => {
  const { workflowId, pageId, access, offline } = attributes;
  return {
    workflowId,
    pageId,
    access: access ?? null,
    offline,
    online: isPageOnline(attributes, canEncrypt),
    createdAt,
    createdBy,
    updatedAt,
    updatedBy,
  };
};

/** Maps a saved object not-found error to a page not-found error. */
export const toPageError = (error: unknown, ref: WorkflowPageRef): unknown =>
  error instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(error)
    ? new WorkflowPageNotFoundError(ref.pageId, ref.workflowId)
    : error;

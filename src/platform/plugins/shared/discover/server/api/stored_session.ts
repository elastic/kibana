/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SavedObjectsErrorHelpers,
  isSavedObjectErrorResult,
  type RequestHandlerContext,
  type SavedObject,
} from '@kbn/core/server';
import { SavedSearchType, type StoredDiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';

/** Resolves a session and returns the headers needed for alias redirects and conflicts. */
export const resolveStoredDiscoverSession = async (
  requestContext: RequestHandlerContext,
  id: string
): Promise<{
  savedObject: SavedObject<DiscoverSessionAttributes>;
  resolveHeaders: Record<string, string>;
}> => {
  const { core } = await requestContext.resolve(['core']);
  const {
    saved_object: savedObject,
    outcome,
    alias_target_id: aliasTargetId,
    alias_purpose: aliasPurpose,
  } = await core.savedObjects.client.resolve<DiscoverSessionAttributes>(SavedSearchType, id);

  if (isSavedObjectErrorResult(savedObject)) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(SavedSearchType, id);
  }

  const resolveHeaders: Record<string, string> = {
    'kbn-resolve-outcome': outcome,
  };
  if (aliasTargetId) {
    resolveHeaders['kbn-resolve-alias-target-id'] = aliasTargetId;
  }
  if (aliasPurpose) {
    resolveHeaders['kbn-resolve-purpose'] = aliasPurpose;
  }

  return { savedObject, resolveHeaders };
};

/** Reads the session with this exact ID without resolving aliases, or `undefined` if missing. */
export const getStoredDiscoverSession = async (
  requestContext: RequestHandlerContext,
  id: string
): Promise<SavedObject<DiscoverSessionAttributes> | undefined> => {
  const { core } = await requestContext.resolve(['core']);

  try {
    return await core.savedObjects.client.get<DiscoverSessionAttributes>(SavedSearchType, id);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }

    throw error;
  }
};

/** Creates a session with the given ID, or with a generated one. */
export const createStoredDiscoverSession = async (
  requestContext: RequestHandlerContext,
  { attributes, references }: StoredDiscoverSession,
  id?: string
): Promise<SavedObject<DiscoverSessionAttributes>> => {
  const { core } = await requestContext.resolve(['core']);

  return core.savedObjects.client.create<DiscoverSessionAttributes>(SavedSearchType, attributes, {
    id,
    references,
  });
};

/**
 * Fully replaces the session with this exact ID and reads it back.
 * A missing session is a not-found error; aliases are not resolved.
 */
export const updateStoredDiscoverSession = async (
  requestContext: RequestHandlerContext,
  id: string,
  { attributes, references }: StoredDiscoverSession
): Promise<SavedObject<DiscoverSessionAttributes>> => {
  const { core } = await requestContext.resolve(['core']);

  await core.savedObjects.client.update<DiscoverSessionAttributes>(
    SavedSearchType,
    id,
    attributes,
    { references, mergeAttributes: false }
  );

  return core.savedObjects.client.get<DiscoverSessionAttributes>(SavedSearchType, id);
};

/**
 * Deletes the session with this exact ID and returns it as it was before deletion.
 * A missing session is a not-found error; aliases are not resolved.
 */
export const deleteStoredDiscoverSession = async (
  requestContext: RequestHandlerContext,
  id: string
): Promise<SavedObject<DiscoverSessionAttributes>> => {
  const { core } = await requestContext.resolve(['core']);
  const savedObject = await core.savedObjects.client.get<DiscoverSessionAttributes>(
    SavedSearchType,
    id
  );

  await core.savedObjects.client.delete(SavedSearchType, id);

  return savedObject;
};

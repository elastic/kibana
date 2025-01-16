/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ISavedObjectTypeRegistry,
  KibanaRequest,
  SavedObjectReference,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';
import { ITagsClient } from '../common';
import { AssignableObject, FindAssignableObjectsOptions, Tag } from '../common/types';

export interface AssignmentServiceOptions {
  request?: KibanaRequest;
  client: SavedObjectsClientContract;
  typeRegistry: ISavedObjectTypeRegistry;
  authorization?: SecurityPluginStart['authz'];
  internal?: boolean;
}

export interface IAssignmentService {
  findAssignableObjects(options: FindAssignableObjectsOptions): Promise<AssignableObject[]>;
}

export interface SavedObjectsTaggingApiServer {
  /**
   * Creates a TagClient bound to the provided SavedObject client.
   */
  createTagClient: ({ client }: { client: SavedObjectsClientContract }) => ITagsClient;
  createInternalAssignmentService: (options: AssignmentServiceOptions) => IAssignmentService;
  getTagsFromReferences: (
    references: SavedObjectReference[],
    allTags: Tag[]
  ) => { tags: Tag[]; missingRefs: SavedObjectReference[] };
  convertTagNameToId: (tagName: string, allTags: Tag[]) => string | undefined;
  replaceTagReferences: (
    references: SavedObjectReference[],
    newTagIds: string[]
  ) => SavedObjectReference[];
}

export interface SavedObjectTaggingOssPluginSetup {
  /**
   * Register a provider for the tagging API.
   *
   * Only one provider can be registered, subsequent calls to this method will fail.
   *
   * @remarks The promise should not resolve any later than the end of the start lifecycle
   *          (after `getStartServices` resolves). Not respecting this condition may cause
   *          runtime failures.
   */
  registerTaggingApi(provider: Promise<SavedObjectsTaggingApiServer>): void;
}

export interface SavedObjectTaggingOssPluginStart {
  /**
   * Returns true if the tagging feature is available (if a provider registered the API)
   */
  isTaggingAvailable(): boolean;

  /**
   * Returns the tagging API, if registered.
   * This will always returns a value if `isTaggingAvailable` returns true, and undefined otherwise.
   */
  getTaggingApi(): SavedObjectsTaggingApiServer | undefined;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsSerializer,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import type {
  SavedObject,
  SavedObjectsRawDoc,
  SavedObjectsRawDocParseOptions,
} from '@kbn/core-saved-objects-server';
import { projectAcl } from '../utils/acl';

export type ISerializerHelper = PublicMethodsOf<SerializerHelper>;

export class SerializerHelper {
  private registry: ISavedObjectTypeRegistry;
  private serializer: ISavedObjectsSerializer;

  constructor({
    registry,
    serializer,
  }: {
    registry: ISavedObjectTypeRegistry;
    serializer: ISavedObjectsSerializer;
  }) {
    this.registry = registry;
    this.serializer = serializer;
  }

  /**
   * Converts a raw document to a saved object for a repository result. The result has no `acl`
   * unless the caller sets `includeAcl`.
   */
  public rawToSavedObject<T = unknown>(
    raw: SavedObjectsRawDoc,
    options?: SavedObjectsRawDocParseOptions,
    { includeAcl = false }: { includeAcl?: boolean } = {}
  ): SavedObject<T> {
    const savedObject = this.serializer.rawToSavedObject(raw, options);
    const { namespace, type } = savedObject;
    if (this.registry.isSingleNamespace(type)) {
      savedObject.namespaces = [SavedObjectsUtils.namespaceIdToString(namespace)];
    }

    return projectAcl(omit(savedObject, ['namespace']), includeAcl) as SavedObject<T>;
  }
}

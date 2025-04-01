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
import {
  SavedObject,
  SavedObjectsRawDoc,
  SavedObjectsRawDocParseOptions,
} from '@kbn/core-saved-objects-server';

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

  public rawToSavedObject<T = unknown>(
    raw: SavedObjectsRawDoc,
    options?: SavedObjectsRawDocParseOptions
  ): SavedObject<T> {
    const savedObject = this.serializer.rawToSavedObject(raw, options);
    const { namespace, type } = savedObject;
    if (this.registry.isSingleNamespace(type)) {
      savedObject.namespaces = [SavedObjectsUtils.namespaceIdToString(namespace)];
    }

    return omit(savedObject, ['namespace']) as SavedObject<T>;
  }
}

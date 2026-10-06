/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsSerializer,
} from '@kbn/core-saved-objects-server';
import type {
  SavedObject,
  SavedObjectsRawDoc,
  SavedObjectsRawDocParseOptions,
} from '@kbn/core-saved-objects-server';
export type ISerializerHelper = PublicMethodsOf<SerializerHelper>;
export declare class SerializerHelper {
  private registry;
  private serializer;
  constructor({
    registry,
    serializer,
  }: {
    registry: ISavedObjectTypeRegistry;
    serializer: ISavedObjectsSerializer;
  });
  rawToSavedObject<T = unknown>(
    raw: SavedObjectsRawDoc,
    options?: SavedObjectsRawDocParseOptions
  ): SavedObject<T>;
}

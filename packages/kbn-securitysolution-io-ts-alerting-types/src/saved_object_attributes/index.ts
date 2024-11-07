/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';

/**
 * TODO: This type are originally from "src/core/types/saved_objects.ts", once that is package friendly remove
 * this copied type.
 *
 * Don't use this type, it's simply a helper type for {@link SavedObjectAttribute}
 *
 * @public
 */
export type SavedObjectAttributeSingle =
  | string
  | number
  | boolean
  | null
  | undefined
  | SavedObjectAttributes;

/**
 * TODO: This type are originally from "src/core/types/saved_objects.ts", once that is package friendly remove
 * this copied type.
 *
 * Type definition for a Saved Object attribute value
 *
 * @public
 */
export type SavedObjectAttribute = SavedObjectAttributeSingle | SavedObjectAttributeSingle[];

/**
 * TODO: This type are originally from "src/core/types/saved_objects.ts", once that is package friendly remove
 * this copied type.
 *
 * The data for a Saved Object is stored as an object in the `attributes`
 * property.
 *
 * @public
 */
export interface SavedObjectAttributes {
  [key: string]: SavedObjectAttribute;
}

export const saved_object_attribute_single: t.Type<SavedObjectAttributeSingle> = t.recursion(
  'saved_object_attribute_single',
  () => t.union([t.string, t.number, t.boolean, t.null, t.undefined, saved_object_attributes])
);
export const saved_object_attribute: t.Type<SavedObjectAttribute> = t.recursion(
  'saved_object_attribute',
  () => t.union([saved_object_attribute_single, t.array(saved_object_attribute_single)])
);
export const saved_object_attributes: t.Type<SavedObjectAttributes> = t.recursion(
  'saved_object_attributes',
  () => t.record(t.string, saved_object_attribute)
);

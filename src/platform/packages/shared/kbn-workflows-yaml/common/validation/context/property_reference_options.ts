/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';

/** How variable validation treats references to properties a schema doesn't have. */
export interface PropertyReferenceOptions {
  /** Message for a reference to a property the schema doesn't have, instead of the generic one. */
  unknownPropertyMessage?: (property: string) => string;
  /** Leaves a property read with a key computed at runtime unchecked, instead of invalid. */
  allowDynamicKeys?: boolean;
}

const propertyReferenceOptions = new WeakMap<z.ZodType, PropertyReferenceOptions>();

/** Sets how variable validation treats references to properties `schema` doesn't have. */
export const withPropertyReferenceOptions = <Schema extends z.ZodType>(
  schema: Schema,
  options: PropertyReferenceOptions
): Schema => {
  propertyReferenceOptions.set(schema, options);
  return schema;
};

/** The options set for `schema` with `withPropertyReferenceOptions`, if any. */
export const getPropertyReferenceOptions = (
  schema: z.ZodType
): PropertyReferenceOptions | undefined => propertyReferenceOptions.get(schema);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';

type UnknownPropertyMessage = (property: string) => string;

const unknownPropertyMessages = new WeakMap<z.ZodType, UnknownPropertyMessage>();

/** Gives references to a property `schema` doesn't have a specific message instead of the generic one. */
export const withUnknownPropertyMessage = <Schema extends z.ZodType>(
  schema: Schema,
  getMessage: UnknownPropertyMessage
): Schema => {
  unknownPropertyMessages.set(schema, getMessage);
  return schema;
};

/** The message `schema` gives for a reference to a property it doesn't have, if it has one. */
export const getUnknownPropertyMessage = (
  schema: z.ZodType,
  property: string
): string | undefined => unknownPropertyMessages.get(schema)?.(property);

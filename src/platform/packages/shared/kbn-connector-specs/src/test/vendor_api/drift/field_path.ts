/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// `allOf[#/components/schemas/Options]/waitFor`: oasdiff names the subschema a property is in.
const COMPOSITION = /(?:allOf|anyOf|oneOf)\[[^\]]*\]\/?/g;

/** A property path oasdiff names, as field use paths are: without the subschemas it is in. */
export const toFieldPath = (oasdiffPath: string): string =>
  oasdiffPath.replace(COMPOSITION, '').replace(/\/$/, '');

/** Whether a field path is a parent path or inside it. */
export const within = (field: string, parent: string): boolean =>
  field === parent || field.startsWith(`${parent}/`);

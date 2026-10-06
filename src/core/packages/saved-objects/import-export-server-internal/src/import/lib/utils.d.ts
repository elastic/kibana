/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @internal
 * Constructs a simple query string for an object that will match any existing objects with the same origin.
 * This matches based on the object's raw document ID (_id) or the object's originId.
 *
 * @param type a saved object type
 * @param id a saved object ID to check; this should be the object's originId if present, otherwise it should be the object's ID
 * @returns a simple query string
 */
export declare function createOriginQuery(type: string, id: string): string;

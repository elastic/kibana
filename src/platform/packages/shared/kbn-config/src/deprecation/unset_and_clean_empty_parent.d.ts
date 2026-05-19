/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Unsets the path and checks if the parent property is an empty object.
 * If so, it removes the property from the config object (mutation is applied).
 *
 * @internal
 */
export declare const unsetAndCleanEmptyParent: (
  config: Record<string, unknown>,
  path: string | string[]
) => void;

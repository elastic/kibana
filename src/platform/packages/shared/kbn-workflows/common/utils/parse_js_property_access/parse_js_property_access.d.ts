/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Parses a JavaScript property access path into its constituent parts.
 *
 * This function breaks down property access strings like "a.b.c", "a[0].b",
 * or "a['key'].b[1]" into an array of individual property names or indices.
 *
 * @param path - The property access path string to parse (e.g., "user.profile['name']")
 * @returns An array of strings representing each property access part
 *
 * @example
 * ```typescript
 * parseJsPropertyAccess("user.profile.name") // Returns: ["user", "profile", "name"]
 * parseJsPropertyAccess("data[0].items['key']") // Returns: ["data", "0", "items", "key"]
 * parseJsPropertyAccess("a.b[1].c") // Returns: ["a", "b", "1", "c"]
 * ```
 */
export declare function parseJsPropertyAccess(path: string): string[];

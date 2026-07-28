/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This is used for looking up function/argument definitions. It looks through
 * the given object/array for a case-insensitive match, which could be either the
 * `name` itself, or something under the `aliases` property.
 */
export declare const ALL_NAMESPACES = '*';
interface Node {
  name?: string;
  aliases?: string[];
  namespace?: string;
}
export declare function getByAlias<T extends Node>(
  node: T[] | Record<string, T>,
  nodeName: string,
  nodeNamespace?: string
): T | undefined;
export {};

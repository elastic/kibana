/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Resolution result indicating that the import request resolves to a built-in node library
 */
export interface BuiltInResult {
  type: 'built-in';
}

/**
 * Resolution result indicating that the import request resolves to an npm dep which isn't
 * currently installed so assumed to be optional
 */
export interface OptionalDepResult {
  type: 'optional-and-missing';
}

/**
 * Resolution result indicating that the import request can't be resolved, but it shouldn't need to be
 * because the file that is imported can't be resolved from the source alone, usually because it is explicitly
 * importing a build asset. Import requests which meet this criteria are manually added to the resolver and
 * can be trusted to exist after the build it complete or in their used location.
 */
export interface IgnoreResult {
  type: 'ignore';
}

/**
 * Resolution result indicating that the import only resolves to an @types package, including the name of
 * the @types package. We don't validate the sub-path of these import strings and assume that TS will validate
 * them, we just need to know that they don't map to actual files on the filesystem or modules which will
 * end up in the build or running code.
 */
export interface TypesResult {
  type: '@types';
  module: string;
}

/**
 * Resolution result indicating that the import resolves to a specific file, possible in a nodeModule, with
 * the path of that file and the name of the nodeModule if applicable
 */
export interface FileResult {
  type: 'file';
  absolute: string;
  nodeModule?: string;
  prefix?: string;
  postfix?: string;
}

/**
 * Possible resolve result types
 */
export type ResolveResult =
  | BuiltInResult
  | IgnoreResult
  | TypesResult
  | FileResult
  | OptionalDepResult;

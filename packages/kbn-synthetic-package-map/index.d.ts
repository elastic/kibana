/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type PackageMap = Map<string, string>;

/**
 * Read the package map from disk
 */
export function readPackageMap(): PackageMap;
/**
 * Read the package map and calculate a cache key/hash of the package map
 */
export function readHashOfPackageMap(): string;

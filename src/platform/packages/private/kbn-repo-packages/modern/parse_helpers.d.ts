/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PACKAGE_TYPES: Array<import('./types').KibanaPackageType>;
/**
 * @param {unknown} v
 * @returns {v is string}
 */
export function isSomeString(v: unknown): v is string;
/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
export function isObj(v: unknown): v is Record<string, unknown>;
/**
 * @param {unknown} v
 * @returns {v is string}
 */
export function isValidPluginId(v: unknown): v is string;
/**
 * @param {unknown} v
 * @returns {v is import('./types').KibanaPackageType}
 */
export function isValidPkgType(v: unknown): v is import('./types').KibanaPackageType;
/**
 * @param {unknown} v
 * @returns {v is string[]}
 */
export function isArrOfIds(v: unknown): v is string[];
/**
 * @param {unknown} v
 * @returns {v is string[]}
 */
export function isArrOfStrings(v: unknown): v is string[];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaPackageType } from './types';

export const PACKAGE_TYPES: KibanaPackageType[];

export function isSomeString(v: unknown): v is string;
export function isObj(v: unknown): v is Record<string, unknown>;
export function isValidPluginId(v: unknown): v is string;
export function isValidPkgType(v: unknown): v is KibanaPackageType;
export function isArrOfStrings(v: unknown): v is string[];
export function isArrOfIds(v: unknown): v is string[];

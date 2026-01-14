/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaPackageJson } from './types';

export const REPO_ROOT: string;
export const PKG_JSON: KibanaPackageJson;
export const kibanaPackageJson: KibanaPackageJson;
export const UPSTREAM_BRANCH: string;

export function isKibanaDistributable(): boolean;
export function fromRoot(...paths: string[]): string;

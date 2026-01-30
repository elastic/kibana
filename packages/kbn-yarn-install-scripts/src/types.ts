/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MANAGED_LIFECYCLES = ['install', 'postinstall'] as const;
export type Lifecycle = (typeof MANAGED_LIFECYCLES)[number];

export interface PackageInstallScript {
  path: string;
  lifecycle: Lifecycle;
  required: boolean;
  reason: string;
}

export interface InstallScriptsConfig {
  packages: PackageInstallScript[];
}

export interface PackageWithInstallScript {
  name: string;
  version: string;
  path: string;
  lifecycle: Lifecycle;
  script: string;
}

export interface PackageJson {
  name?: string;
  version?: string;
  scripts?: {
    install?: string;
    postinstall?: string;
  };
}

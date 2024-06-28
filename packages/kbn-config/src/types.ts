/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @public
 */
export interface PackageInfo {
  version: string;
  branch: string;
  buildNum: number;
  buildSha: string;
  buildShaShort: string;
  buildDate: Date;
  buildFlavor: BuildFlavor;
  dist: boolean;
}

/**
 * @public
 */
export interface EnvironmentMode {
  name: 'development' | 'production';
  dev: boolean;
  prod: boolean;
}

export type BuildFlavor = 'serverless' | 'traditional';

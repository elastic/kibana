/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface Ransomware {
  feature?: string[];
  score?: string[];
  version?: number[];
  child_pids?: string[];
  files?: RansomwareFiles;
}

export interface RansomwareFiles {
  operation?: string[];
  entropy?: number[];
  metrics?: string[];
  extension?: string[];
  original?: OriginalRansomwareFiles;
  path?: string[];
  data?: string[];
  score?: number[];
}

export interface OriginalRansomwareFiles {
  path?: string[];
  extension?: string[];
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VirtualVersionMap } from './version_map';
export interface CompareModelVersionMapParams {
  /** The latest model version of the types registered in the application */
  appVersions: VirtualVersionMap;
  /** The model version stored in the index */
  indexVersions: VirtualVersionMap;
  /** The list of deleted types to exclude during the compare process */
  deletedTypes: string[];
}
/**
 * The overall status of the model version comparison:
 * - `greater`: app version is greater than the index version
 * - `lesser`: app version is lesser than the index version
 * - `equal`: app version is equal to the index version
 * - `conflict`: app and index versions are incompatible (versions for some types are higher, and for other types lower)
 */
export type CompareModelVersionStatus = 'greater' | 'lesser' | 'equal' | 'conflict';
export interface CompareModelVersionDetails {
  greater: string[];
  lesser: string[];
  equal: string[];
}
export interface CompareModelVersionResult {
  status: CompareModelVersionStatus;
  details: CompareModelVersionDetails;
}
export declare const compareVirtualVersions: ({
  appVersions,
  indexVersions,
  deletedTypes,
}: CompareModelVersionMapParams) => CompareModelVersionResult;

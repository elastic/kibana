/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** Container for metadata that can be attached to different ci-stats objects */
export interface CiStatsMetadata {
  /**
   * Arbitrary key-value pairs which can be attached to CiStatsTiming and CiStatsMetric
   * objects stored in the ci-stats service
   */
  [key: string]: string | string[] | number | boolean | undefined;
}

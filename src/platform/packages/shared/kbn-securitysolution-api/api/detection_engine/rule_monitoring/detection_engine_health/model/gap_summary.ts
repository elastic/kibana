/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface GapSummary {
  /**
   * The sum of unfilled gaps in milliseconds
   */
  total_unfilled_duration_ms: number;
  /**
   * The sum of in progress gaps in milliseconds
   */
  total_in_progress_duration_ms: number;
  /**
   * The sum of filled gaps in milliseconds
   */
  total_filled_duration_ms: number;
}

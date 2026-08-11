/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Base interface that any item must implement to be used in critical path calculations.
 *
 * This is intentionally a minimal interface to keep getCriticalPath() generic and reusable.
 */
export interface CriticalPathBase {
  id: string;
  offset: number;
  duration: number;
  skew: number;
}

export interface CriticalPathSegment<T extends CriticalPathBase> {
  item: T;
  offset: number;
  duration: number;
  self: boolean;
}

export interface CriticalPath<T extends CriticalPathBase> {
  segments: CriticalPathSegment<T>[];
}

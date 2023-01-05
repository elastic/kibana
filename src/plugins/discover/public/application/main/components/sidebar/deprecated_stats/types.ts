/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface ValidFieldDetails {
  exists: number;
  total: number;
  missing: number;
  buckets: Bucket[];
}

export interface ErrorFieldDetails {
  error: string;
}

export type FieldDetails = ValidFieldDetails | ErrorFieldDetails;

export interface Bucket {
  display: string;
  value: string;
  percent: number;
  count: number;
}

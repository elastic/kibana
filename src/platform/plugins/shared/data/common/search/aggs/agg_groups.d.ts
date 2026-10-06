/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { $Values } from '@kbn/utility-types';
export declare const AggGroupNames: Readonly<{
  Buckets: 'buckets';
  Metrics: 'metrics';
  None: 'none';
}>;
export type AggGroupName = $Values<typeof AggGroupNames>;
export declare const AggGroupLabels: {
  buckets: string;
  metrics: string;
  none: string;
};

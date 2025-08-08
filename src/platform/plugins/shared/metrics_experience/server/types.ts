/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';

export interface Dimension {
  name: string;
  type: string;
  description?: string;
}

export interface MetricField {
  name: string;
  index: string; // TODO: Change this to `datastream`
  dimensions: Array<Dimension>;
  type: string;
  time_series_metric?: string;
  unit?: string;
  description?: string;
  source?: string;
  stability?: string;
  display?: string;
  no_data?: boolean;
}

export type DataStreamFieldCapsMap = Map<
  string,
  Record<string, Record<string, FieldCapsFieldCapability>>
>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter, DataViewBase } from '@kbn/es-query';
export declare function getFieldDisplayValueFromFilter(
  filter: Filter,
  indexPatterns: DataView[] | DataViewBase[]
): string;
export declare function getDisplayValueFromFilter(
  filter: Filter,
  indexPatterns: DataViewBase[]
): string;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScriptedRangeFilter, RangeFilter, Filter } from '@kbn/es-query';
import type { FILTERS } from '@kbn/es-query';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
export declare function getRangeDisplayValue(
  {
    meta: { params },
  }: RangeFilter | ScriptedRangeFilter,
  formatter?: FieldFormat
): string;
export declare const isMapRangeFilter: (filter: any) => filter is RangeFilter;
export declare const mapRange: (filter: Filter) => {
  type: FILTERS;
  key: string;
  value: any;
  params: any;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexPattern, DateRange } from '../../types';
import type { BaseIndexPatternColumn, FormBasedLayer } from '../../datasources/types';

/**
 * Represents an ES|QL expression with parameterized values.
 * Use ??paramName for field/column identifiers (esql-composer will escape properly)
 * Use ?paramName for literal values (strings, numbers)
 */
export interface ESQLExpressionWithParams {
  template: string;
  params?: Record<string, string | number>;
}

/**
 * Minimal read-only ui settings accessor, structurally compatible with
 * core's `IUiSettingsClient` so browser consumers can pass it directly.
 */
export interface UiSettingsReader {
  get<T = unknown>(key: string): T;
}

/**
 * Signature of a per-operation DSL-to-ES|QL conversion function.
 * Mirrors `OperationDefinition['toESQL']` but only depends on node-safe types.
 */
export type ToEsqlFn<C extends BaseIndexPatternColumn = BaseIndexPatternColumn> = (
  column: C,
  columnId: string,
  indexPattern: IndexPattern,
  layer: FormBasedLayer,
  uiSettings: UiSettingsReader,
  dateRange: DateRange
) => ESQLExpressionWithParams | undefined;

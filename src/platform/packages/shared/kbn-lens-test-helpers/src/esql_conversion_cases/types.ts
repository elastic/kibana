/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type EsqlConversionDatasetId = 'ecommerce' | 'logs';

export interface EsqlConversionDataset {
  readonly id: EsqlConversionDatasetId;
  readonly index: string;
  /** Undefined models a data view without a time field. */
  readonly timeField?: string;
  readonly fieldTypes: Readonly<Record<string, string>>;
}

export interface EsqlConversionColumn {
  readonly operationType: string;
  readonly label: string;
  readonly dataType: string;
  readonly isBucketed: boolean;
  readonly sourceField?: string;
  readonly timeShift?: string;
  readonly reducedTimeRange?: string;
  readonly filter?: { readonly language: string; readonly query: string };
  readonly customLabel?: boolean;
  readonly params?: Readonly<Record<string, unknown>>;
}

export interface EsqlConversionSuccess {
  readonly success: true;
  readonly esql: string;
  readonly columnNames: readonly string[];
  readonly expectedSourceIds: Readonly<Record<string, readonly string[]>>;
  readonly expectedFormats?: Readonly<Record<string, unknown>>;
  readonly expectedLabels?: Readonly<Record<string, string>>;
  /** EVAL-only queries preserve source columns in addition to generated columns. */
  readonly allowAdditionalColumns?: true;
}

export interface EsqlConversionFailure {
  readonly success: false;
  readonly reason: string;
}

export type EsqlConversionCaseGroup = 'core' | 'date_histogram' | 'top_n' | 'static_value';

export interface EsqlConversionCase {
  readonly group: EsqlConversionCaseGroup;
  readonly dataset: EsqlConversionDataset;
  readonly description: string;
  readonly columns: Readonly<Record<string, EsqlConversionColumn>>;
  readonly columnOrder: readonly string[];
  readonly columnRoles?: Readonly<Record<string, string>>;
  /** Models a detached time picker; auto date histograms fall back to 1h. */
  readonly omitDateRange?: true;
  readonly expected: EsqlConversionSuccess | EsqlConversionFailure;
}

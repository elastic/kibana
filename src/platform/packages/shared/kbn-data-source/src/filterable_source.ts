/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';

/**
 * The part of a field that filtering reads. A `DataViewField` satisfies it, and so does a field of
 * any other source. The label and spec members are optional capabilities.
 */
export type FilterableField = DataViewFieldBase & {
  readonly searchable?: boolean;
  readonly aggregatable?: boolean;
  readonly filterable?: boolean;
  readonly customLabel?: string;
  readonly displayName?: string;
  toSpec?(): unknown;
};

/**
 * What filtering needs from a data source: unified search, KQL, filter pills and the helpers behind
 * them. A `DataView` satisfies it as it is. For an `EsqlSource` it is the identity of the dataset
 * (not of the query): the dataset id that `filter.meta.index` carries, and the fields of the FROM
 * target. Formatters and field labels are optional capabilities of the value, as in the helpers that
 * read them (`'getFormatterForField' in indexPattern`).
 */
export interface FilterableSource extends DataViewBase {
  readonly fields: FilterableField[];
  readonly name?: string;
  readonly timeFieldName?: string;
  getName?(): string;
  isTimeBased(): boolean;
}

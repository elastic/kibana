/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldSpec, RuntimeFieldSpec } from '@kbn/data-views-plugin/common';
import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import type { DataSourceKind } from './types';

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
  toSpec?(): FieldSpec;
};

/**
 * What filtering needs from a data source: unified search, KQL, filter pills and the helpers behind
 * them. A `DataView` satisfies it as it is. For an `EsqlSource` it is the identity of the dataset
 * (not of the query): the dataset id that `filter.meta.index` carries, and the fields of the FROM
 * target. A `DataView` also has the optional members, which are what a consumer that does more than
 * filter reads when it is there: a field by name, the formatter of a field and the runtime fields.
 */
export interface FilterableSource extends DataViewBase {
  /**
   * Set by sources that are not data views: `'esql'` for the dataset of an ES|QL query. A `DataView`
   * has none, so its absence means the source can be loaded as a data view by its id.
   */
  readonly kind?: DataSourceKind;
  readonly fields: FilterableField[];
  readonly name?: string;
  readonly timeFieldName?: string;
  /** For an ES|QL source: its source command alone (`FROM x`), which a query on its FROM target starts with. */
  readonly sourceQuery?: string;
  getName?(): string;
  isTimeBased(): boolean;
  getFieldByName(name: string): FilterableField | undefined;
  getFormatterForField?(field: FilterableField): { convertToText(value: unknown): string };
  /** The spec of the source, of which the runtime fields are read. */
  toSpec?(includeFields?: boolean): { runtimeFieldMap?: Record<string, RuntimeFieldSpec> };
}

/** Whether the source is the dataset of an ES|QL query, whose id is not the id of a data view. */
export const isEsqlFilterableSource = (source: FilterableSource): boolean => source.kind === 'esql';

/** The spec of a field: its own when it has one, otherwise the one that the field makes. */
export const getFilterableFieldSpec = (field: FilterableField): FieldSpec =>
  field.toSpec?.() ?? {
    ...field,
    searchable: Boolean(field.searchable),
    aggregatable: Boolean(field.aggregatable),
  };

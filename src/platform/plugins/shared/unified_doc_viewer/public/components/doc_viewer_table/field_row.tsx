/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import { DataViewField, type DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { IgnoredReason } from '@kbn/discover-utils';
import {
  convertValueToString,
  formatFieldValueReact,
  getIgnoredReason,
  isNestedFieldParent,
} from '@kbn/discover-utils';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { getFieldIconType, getTextBasedColumnIconType } from '@kbn/field-utils';
import { convertDatatableColumnToDataViewFieldSpec } from '@kbn/data-view-utils';
import { type DataSource, EsqlSource, IndexPatternSource } from '@kbn/data-source';

export class FieldRow {
  readonly name: string;
  readonly displayNameOverride: string | undefined;
  readonly flattenedValue: unknown;
  readonly dataViewField: DataViewField | undefined;
  readonly isPinned: boolean;
  readonly dataSource: DataSource | undefined;

  readonly #hit: DataTableRecord;
  readonly #dataView: DataView;
  readonly #fieldFormats: FieldFormatsStart;

  #isFormattedAsText: boolean;
  #isFormattedAsReact: boolean;

  #formattedAsText: string | undefined;
  #formattedAsReact: ReactNode | undefined;

  #fieldType: string | undefined;

  constructor({
    name,
    displayNameOverride,
    flattenedValue,
    hit,
    dataView,
    fieldFormats,
    isPinned,
    dataSource,
  }: {
    name: string;
    displayNameOverride?: string;
    flattenedValue: unknown;
    hit: DataTableRecord;
    dataView: DataView;
    fieldFormats: FieldFormatsStart;
    isPinned: boolean;
    dataSource: DataSource | undefined;
  }) {
    this.#hit = hit;
    this.#dataView = dataView;
    this.#fieldFormats = fieldFormats;
    this.#isFormattedAsText = false;
    this.#isFormattedAsReact = false;

    this.name = name;
    this.displayNameOverride = displayNameOverride;
    this.flattenedValue = flattenedValue;
    this.dataViewField = resolveFieldFromDataSource(dataSource, name) ?? dataView.fields.getByName(name);
    this.isPinned = isPinned;
    this.dataSource = dataSource;
  }

  // format as React node in a lazy way
  public get formattedAsReact(): ReactNode {
    if (!this.#isFormattedAsReact) {
      this.#formattedAsReact = formatFieldValueReact({
        value: this.flattenedValue,
        hit: this.#hit.raw,
        fieldFormats: this.#fieldFormats,
        dataView: this.#dataView,
        field: this.dataViewField,
      });
      this.#isFormattedAsReact = true;
    }

    return this.#formattedAsReact;
  }

  // format as text in a lazy way
  public get formattedAsText(): string | undefined {
    if (!this.#isFormattedAsText) {
      this.#formattedAsText = convertValueToString({
        dataView: this.#dataView,
        dataViewField: this.dataViewField,
        flattenedValue: this.flattenedValue,
        dataTableRecord: this.#hit,
        fieldFormats: this.#fieldFormats,
        options: {
          compatibleWithCSV: true,
        },
      }).formattedString;
      this.#isFormattedAsText = true;
    }

    return this.#formattedAsText;
  }

  public get fieldType(): string | undefined {
    if (!this.#fieldType) {
      const esqlMeta =
        this.dataSource instanceof EsqlSource
          ? this.dataSource.resultColumns.find((c) => c.name === this.name)?.meta
          : undefined;
      const columnIconType = esqlMeta ? getTextBasedColumnIconType(esqlMeta) : undefined;
      const fieldType = columnIconType
        ? columnIconType // for text-based results types come separately
        : isNestedFieldParent(this.name, this.#dataView)
        ? 'nested'
        : this.dataViewField
        ? getFieldIconType(this.dataViewField)
        : undefined;

      this.#fieldType = fieldType;
    }

    return this.#fieldType;
  }

  public get ignoredReason(): IgnoredReason | undefined {
    return this.dataViewField
      ? getIgnoredReason(this.dataViewField, this.#hit.raw._ignored)
      : undefined;
  }
}

function resolveFieldFromDataSource(
  dataSource: DataSource | undefined,
  name: string
): DataViewField | undefined {
  if (dataSource instanceof IndexPatternSource) {
    return dataSource.getDataView().fields.getByName(name);
  }
  if (dataSource instanceof EsqlSource) {
    const column = dataSource.resultColumns.find((c) => c.name === name);
    return column ? new DataViewField(convertDatatableColumnToDataViewFieldSpec(column)) : undefined;
  }
  return undefined;
}

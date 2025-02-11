/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { DataTableColumnsMeta, DataTableRecord } from '@kbn/discover-utils/types';
import {
  formatFieldValue,
  getIgnoredReason,
  IgnoredReason,
  isNestedFieldParent,
} from '@kbn/discover-utils';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { getFieldIconType, getTextBasedColumnIconType } from '@kbn/field-utils';
import { getDataViewFieldOrCreateFromColumnMeta } from '@kbn/data-view-utils';

export class FieldRow {
  readonly name: string;
  readonly flattenedValue: unknown;
  readonly dataViewField: DataViewField | undefined;
  readonly isPinned: boolean;
  readonly columnsMeta: DataTableColumnsMeta | undefined;

  readonly #hit: DataTableRecord;
  readonly #dataView: DataView;
  readonly #fieldFormats: FieldFormatsStart;

  #isFormattedAsHtml: boolean;
  #isFormattedAsText: boolean;

  #formattedAsHtml: string | undefined;
  #formattedAsText: string | undefined;

  #fieldType: string | undefined;

  constructor({
    name,
    flattenedValue,
    hit,
    dataView,
    fieldFormats,
    isPinned,
    columnsMeta,
  }: {
    name: string;
    flattenedValue: unknown;
    hit: DataTableRecord;
    dataView: DataView;
    fieldFormats: FieldFormatsStart;
    isPinned: boolean;
    columnsMeta: DataTableColumnsMeta | undefined;
  }) {
    this.#hit = hit;
    this.#dataView = dataView;
    this.#fieldFormats = fieldFormats;
    this.#isFormattedAsHtml = false;
    this.#isFormattedAsText = false;

    this.name = name;
    this.flattenedValue = flattenedValue;
    this.dataViewField = getDataViewFieldOrCreateFromColumnMeta({
      dataView,
      fieldName: name,
      columnMeta: columnsMeta?.[name],
    });
    this.isPinned = isPinned;
    this.columnsMeta = columnsMeta;
  }

  // format as html in a lazy way
  public get formattedAsHtml(): string | undefined {
    if (!this.#isFormattedAsHtml) {
      this.#formattedAsHtml = formatFieldValue(
        this.flattenedValue,
        this.#hit.raw,
        this.#fieldFormats,
        this.#dataView,
        this.dataViewField,
        'html'
      );
      this.#isFormattedAsHtml = true;
    }

    return this.#formattedAsHtml;
  }

  // format as text in a lazy way
  public get formattedAsText(): string | undefined {
    if (!this.#isFormattedAsText) {
      this.#formattedAsText = String(
        formatFieldValue(
          this.flattenedValue,
          this.#hit.raw,
          this.#fieldFormats,
          this.#dataView,
          this.dataViewField,
          'text'
        )
      );
      this.#isFormattedAsText = true;
    }

    return this.#formattedAsText;
  }

  public get fieldType(): string | undefined {
    if (!this.#fieldType) {
      const columnMeta = this.columnsMeta?.[this.name];
      const columnIconType = getTextBasedColumnIconType(columnMeta);
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { formatFieldValue } from '@kbn/discover-utils';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

export class FieldRow {
  readonly name: string;
  readonly flattenedValue: unknown;

  readonly #rawHit: EsHitRecord;
  readonly #dataView: DataView;
  readonly #fieldFormats: FieldFormatsStart;

  #isFormattedAsHtml: boolean;
  #isFormattedAsText: boolean;

  #formattedAsHtml: string | undefined;
  #formattedAsText: string | undefined;

  constructor(
    name: string,
    flattenedValue: unknown,
    rawHit: EsHitRecord,
    dataView: DataView,
    fieldFormats: FieldFormatsStart
  ) {
    this.name = name;
    this.flattenedValue = flattenedValue;
    this.#rawHit = rawHit;
    this.#dataView = dataView;
    this.#fieldFormats = fieldFormats;
    this.#isFormattedAsHtml = false;
    this.#isFormattedAsText = false;
  }

  // format as html in a lazy way
  public get formattedAsHtml(): string | undefined {
    if (!this.#isFormattedAsHtml) {
      this.#formattedAsHtml = formatFieldValue(
        this.flattenedValue,
        this.#rawHit,
        this.#fieldFormats,
        this.#dataView,
        this.#dataView.getFieldByName(this.name),
        'html'
      );
      this.#isFormattedAsHtml = true;
    }

    return this.#formattedAsHtml;
  }

  // format as html in a lazy way
  public get formattedAsText(): string | undefined {
    if (!this.#isFormattedAsText) {
      this.#formattedAsText = formatFieldValue(
        this.flattenedValue,
        this.#rawHit,
        this.#fieldFormats,
        this.#dataView,
        this.#dataView.getFieldByName(this.name),
        'text'
      );
      this.#isFormattedAsText = true;
    }

    return this.#formattedAsText;
  }
}

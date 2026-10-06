/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import type { ReactConvertFunction, TextContextTypeConvert } from '../types';
import type { FIELD_FORMAT_IDS } from '../types';
/** @public */
export declare class StringFormat extends FieldFormat {
  static id: FIELD_FORMAT_IDS;
  static title: string;
  static fieldType: KBN_FIELD_TYPES[];
  static transformOptions: (
    | {
        kind: boolean;
        text: string;
      }
    | {
        kind: string;
        text: string;
      }
  )[];
  getParamDefaults(): {
    transform: boolean;
  };
  private base64Decode;
  private toTitleCase;
  textConvert: TextContextTypeConvert;
  reactConvert: ReactConvertFunction;
  /**
   * Applies the selected transform (if any) to the highlighted snippets so they still align with
   * the transformed field value. Only case transforms (lower/upper/title) are handled: they
   * preserve character positions, so each snippet can be transformed as a whole. Short Dots,
   *  Base64 and URL Param move characters around, so they are left out and their highlights are simply dropped.
   */
  private applyTransformsToHighlightHit;
}

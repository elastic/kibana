/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import type { FieldFormat, FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import type { FormatterField } from './types';
import { getColumnEsTypes } from './to_column';

/** The Elasticsearch types of a field: its `esTypes`, or the single `esType` of a `Column`. */
export const getFormatterEsTypes = ({ esTypes, esType }: FormatterField): string[] | undefined =>
  esTypes?.length ? esTypes : getColumnEsTypes(esType);

/** The formatter of a field from its types alone: a default for its Elasticsearch type wins over its Kibana type. */
export const getDefaultFormatter = (
  field: FormatterField,
  fieldFormats: FieldFormatsStartCommon
): FieldFormat =>
  fieldFormats.getDefaultInstance(
    field.type as KBN_FIELD_TYPES,
    getFormatterEsTypes(field) as ES_FIELD_TYPES[]
  );

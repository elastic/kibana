/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from 'lodash';

export const ELASTIC_UI_NUMERIC_FONT_FAMILY = "'Elastic UI Numeric'";

const isRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);

export const applyNumericFontFamily = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach(applyNumericFontFamily);
    return;
  }

  if (!isRecord(value)) return;

  for (const [key, entry] of Object.entries(value)) {
    if (key === 'fontFamily' && typeof entry === 'string') {
      value[key] = entry.includes(ELASTIC_UI_NUMERIC_FONT_FAMILY)
        ? entry
        : `${ELASTIC_UI_NUMERIC_FONT_FAMILY}, ${entry}`;
      continue;
    }

    applyNumericFontFamily(entry);
  }
};

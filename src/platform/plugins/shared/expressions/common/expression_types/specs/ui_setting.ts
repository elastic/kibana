/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Datatable, DatatableColumnType } from './datatable';
import { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';
import { ExpressionValueRender } from './render';

const name = 'ui_setting';

function getType(value: unknown): DatatableColumnType {
  if (value == null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return value.length ? getType(value[0]) : 'unknown';
  }

  if (['boolean', 'number', 'object', 'string'].includes(typeof value)) {
    return typeof value as DatatableColumnType;
  }

  return 'unknown';
}

export type UiSetting = ExpressionValueBoxed<'ui_setting', { key: string; value: unknown }>;

export const uiSetting: ExpressionTypeDefinition<'ui_setting', UiSetting> = {
  name,
  to: {
    boolean({ value }) {
      return Boolean(value);
    },
    number({ value }) {
      return Number(value);
    },
    string({ value }) {
      return String(value ?? '');
    },
    render({ value }): ExpressionValueRender<{ text: string }> {
      return {
        type: 'render',
        as: 'text',
        value: {
          text:
            typeof value === 'object' && value !== null
              ? JSON.stringify(value)
              : String(value ?? ''),
        },
      };
    },
    datatable({ key, value }): Datatable {
      return {
        type: 'datatable',
        columns: [{ id: key, name: key, meta: { type: getType(value) } }],
        rows: (Array.isArray(value) ? value : [value]).map((cell) => ({ [key]: cell })),
      };
    },
  },
};

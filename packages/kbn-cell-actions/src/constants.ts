/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';

export const FILTER_CELL_ACTION_TYPE = 'cellAction-filter';
export const COPY_CELL_ACTION_TYPE = 'cellAction-copy';

export enum CellActionsMode {
  HOVER_DOWN = 'hover-down',
  HOVER_RIGHT = 'hover-right',
  INLINE = 'inline',
}

export const SUPPORTED_KBN_TYPES = [
  KBN_FIELD_TYPES.DATE,
  KBN_FIELD_TYPES.IP,
  KBN_FIELD_TYPES.STRING,
  KBN_FIELD_TYPES.NUMBER,
  KBN_FIELD_TYPES.BOOLEAN,
];

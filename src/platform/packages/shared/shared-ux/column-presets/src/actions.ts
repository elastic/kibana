/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type EuiTableActionsColumnType, RIGHT_ALIGNMENT } from '@elastic/eui';
import type { ColumnPreset } from './types';

export const columnPresetActions: ColumnPreset<{
  actions?: EuiTableActionsColumnType<any>['actions'];
}> = ({ actions }) => {
  return {
    width: '4.5em',
    minWidth: '4.5em',
    align: RIGHT_ALIGNMENT,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDataGridSelectors } from '@elastic/eui-test-helpers';

/**
 * Header label cells of an EuiDataGrid, excluding control columns. Built from the
 * selector constants EUI test helpers export, until `EuiDataGridObject` exposes headers.
 */
export const dataGridHeaderCellContentSelector = (): string => {
  const { HEADER_CELL_SELECTOR } = EuiDataGridSelectors;
  return `${HEADER_CELL_SELECTOR}:not(${HEADER_CELL_SELECTOR}--controlColumn) ${HEADER_CELL_SELECTOR}__content`;
};

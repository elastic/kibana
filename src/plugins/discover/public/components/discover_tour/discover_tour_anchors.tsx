/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { htmlIdGenerator } from '@elastic/eui';

export const DISCOVER_TOUR_STEP_ANCHOR_IDS = {
  addFields: htmlIdGenerator('dsc-tour-step-add-fields')(),
  expandDocument: htmlIdGenerator('dsc-tour-step-expand')(),
};

export const DISCOVER_TOUR_STEP_ANCHORS = {
  addFields: `[data-test-subj="fieldListGroupedAvailableFields-count"], #${DISCOVER_TOUR_STEP_ANCHOR_IDS.addFields}`,
  reorderColumns: '[data-test-subj="dataGridColumnSelectorButton"]',
  sort: '[data-test-subj="dataGridColumnSortingButton"]',
  changeRowHeight: '[data-test-subj="dataGridDisplaySelectorButton"]',
  expandDocument: `#${DISCOVER_TOUR_STEP_ANCHOR_IDS.expandDocument}`,
};

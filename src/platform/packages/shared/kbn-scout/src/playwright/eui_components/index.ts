/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Component Objects from the published `@elastic/eui-test-helpers`, consumed
// through the `page.components` factories. Re-exported here so `@kbn/scout` and
// the solution Scout packages expose them under a single entry point.
export {
  EuiComboBoxObject,
  EuiDataGridObject,
  EuiGlobalToastListObject,
  EuiSuperSelectObject,
  EuiSelectableObject,
  EuiBasicTableObject,
  EuiDraggableObject,
} from '@elastic/eui-test-helpers';

import {
  EuiAccordionSelectors,
  EuiBasicTableSelectors,
  EuiColorPickerSelectors,
  EuiComboBoxSelectors,
  EuiContextMenuSelectors,
  EuiDataGridSelectors,
  EuiDraggableSelectors,
  EuiFilterButtonSelectors,
  EuiFlyoutSelectors,
  EuiModalSelectors,
  EuiPopoverSelectors,
  EuiRangeSelectors,
  EuiSelectableSelectors,
  EuiSuperSelectSelectors,
  EuiGlobalToastListSelectors,
  EuiToolTipSelectors,
  EuiTreeViewSelectors,
} from '@elastic/eui-test-helpers';

/**
 * Stable EUI selectors, keyed like `page.components`, for when no Component Object method fits.
 *
 * @example page.locator(euiSelectors.basicTable.ROW_SELECTOR)
 */
export const euiSelectors = {
  accordion: EuiAccordionSelectors,
  basicTable: EuiBasicTableSelectors,
  colorPicker: EuiColorPickerSelectors,
  comboBox: EuiComboBoxSelectors,
  contextMenu: EuiContextMenuSelectors,
  dataGrid: EuiDataGridSelectors,
  draggable: EuiDraggableSelectors,
  filterButton: EuiFilterButtonSelectors,
  flyout: EuiFlyoutSelectors,
  modal: EuiModalSelectors,
  popover: EuiPopoverSelectors,
  range: EuiRangeSelectors,
  selectable: EuiSelectableSelectors,
  superSelect: EuiSuperSelectSelectors,
  toast: EuiGlobalToastListSelectors,
  toolTip: EuiToolTipSelectors,
  treeView: EuiTreeViewSelectors,
} as const;

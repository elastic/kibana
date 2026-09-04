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

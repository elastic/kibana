/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiComboBoxObject } from '@elastic/eui-test-helpers';
import { EuiDataGridObject } from './data_grid_object';
import { EuiGlobalToastListObject } from './global_toast_list_object';
import { EuiSuperSelectObject } from './super_select_object';
import { EuiDataGridWrapper } from './data_grid';
import { EuiToastWrapper } from './toast';
import { EuiFieldTextWrapper } from './field_text';
import { EuiCodeBlockWrapper } from './code_block';
import { EuiSuperSelectWrapper } from './super_select';

export {
  // Component Objects (@elastic/eui-test-helpers + prototypes destined for it),
  // consumed through the `page.components` factories.
  EuiComboBoxObject,
  EuiDataGridObject,
  EuiGlobalToastListObject,
  EuiSuperSelectObject,
  // Deprecated wrappers, kept until all consumers are migrated to `page.components`.
  EuiDataGridWrapper,
  EuiToastWrapper,
  EuiFieldTextWrapper,
  EuiCodeBlockWrapper,
  EuiSuperSelectWrapper,
};

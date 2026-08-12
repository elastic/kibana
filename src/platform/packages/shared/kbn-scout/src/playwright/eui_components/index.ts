/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiComboBoxObject,
  EuiDataGridObject,
  EuiGlobalToastListObject,
  EuiSuperSelectObject,
} from '@elastic/eui-test-helpers';
import { EuiDataGridWrapper } from './data_grid';
import { EuiToastWrapper } from './toast';
import { EuiFieldTextWrapper } from './field_text';
import { EuiCodeBlockWrapper } from './code_block';
import { EuiSuperSelectWrapper } from './super_select';

export {
  // Component Objects from the published `@elastic/eui-test-helpers`, consumed
  // through the `page.components` factories.
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

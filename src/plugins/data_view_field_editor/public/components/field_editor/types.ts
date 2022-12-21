/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';

import { RuntimeType } from '../../shared_imports';

export type TypeSelection = Array<EuiComboBoxOptionOption<RuntimeType>>;

export interface FieldTypeInfo {
  name: string;
  type: string;
}

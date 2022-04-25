/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';

import type { VisEditorOptionsProps } from '../../../../visualizations/public';
import type { VisParams } from '../../types';

function SettingsOptions({ stateParams, setValue }: VisEditorOptionsProps<VisParams>) {
  return <EuiPanel paddingSize="s">Foo Options</EuiPanel>;
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { SettingsOptions as default };

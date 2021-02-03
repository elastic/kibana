/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiDelayRender, EuiLoadingContent } from '@elastic/eui';
import { useUiSetting } from '../ui_settings';
import type { Props } from './code_editor';

const LazyBaseEditor = React.lazy(() => import('./code_editor'));

const Fallback = () => (
  <EuiDelayRender>
    <EuiLoadingContent lines={3} />
  </EuiDelayRender>
);

export const CodeEditor: React.FunctionComponent<Props> = (props) => {
  const darkMode = useUiSetting<boolean>('theme:darkMode');
  return (
    <React.Suspense fallback={<Fallback />}>
      <LazyBaseEditor {...props} useDarkTheme={darkMode} />
    </React.Suspense>
  );
};

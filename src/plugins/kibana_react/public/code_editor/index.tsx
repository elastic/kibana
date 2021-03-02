/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiDelayRender,
  EuiErrorBoundary,
  EuiLoadingContent,
  EuiFormControlLayout,
} from '@elastic/eui';
import euiThemeDark from '@elastic/eui/dist/eui_theme_dark.json';
import euiThemeLight from '@elastic/eui/dist/eui_theme_light.json';
import { useUiSetting } from '../ui_settings';
import type { Props } from './code_editor';

const LazyBaseEditor = React.lazy(() => import('./code_editor'));

export const CodeEditor: React.FunctionComponent<Props> = (props) => {
  const { width, height, options } = props;

  const darkMode = useUiSetting<boolean>('theme:darkMode');
  const theme = darkMode ? euiThemeDark : euiThemeLight;
  const style = {
    width,
    height,
    backgroundColor: options?.readOnly
      ? theme.euiFormBackgroundReadOnlyColor
      : theme.euiFormBackgroundColor,
  };

  return (
    <EuiErrorBoundary>
      <React.Suspense
        fallback={
          <EuiFormControlLayout
            append={<div hidden />}
            style={{ ...style, padding: theme.paddingSizes.m }}
            readOnly={options?.readOnly}
          >
            <EuiDelayRender>
              <EuiLoadingContent />
            </EuiDelayRender>
          </EuiFormControlLayout>
        }
      >
        <EuiFormControlLayout append={<div hidden />} style={style} readOnly={options?.readOnly}>
          <LazyBaseEditor {...props} useDarkTheme={darkMode} />
        </EuiFormControlLayout>
      </React.Suspense>
    </EuiErrorBoundary>
  );
};

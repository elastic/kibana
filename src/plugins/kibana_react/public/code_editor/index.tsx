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
import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { useUiSetting } from '../ui_settings';
import { Props } from './code_editor';
import './register_languages';

export * from './languages';

const LazyBaseEditor = React.lazy(() => import('./code_editor'));

const Fallback = () => (
  <EuiDelayRender>
    <EuiLoadingContent lines={3} />
  </EuiDelayRender>
);

export type CodeEditorProps = Props;

/**
 * Renders a Monaco code editor with EUI color theme.
 *
 * @see CodeEditorField to render a code editor in the same style as other EUI form fields.
 */
export const CodeEditor: React.FunctionComponent<Props> = (props) => {
  const darkMode = useUiSetting<boolean>('theme:darkMode');
  return (
    <EuiErrorBoundary>
      <React.Suspense fallback={<Fallback />}>
        <LazyBaseEditor {...props} useDarkTheme={darkMode} />
      </React.Suspense>
    </EuiErrorBoundary>
  );
};

/**
 * Renders a Monaco code editor in the same style as other EUI form fields.
 */
export const CodeEditorField: React.FunctionComponent<Props> = (props) => {
  const { width, height, options, fullWidth } = props;
  const darkMode = useUiSetting<boolean>('theme:darkMode');
  const theme = darkMode ? darkTheme : lightTheme;
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
            <Fallback />
          </EuiFormControlLayout>
        }
      >
        <EuiFormControlLayout
          append={<div hidden />}
          style={style}
          readOnly={options?.readOnly}
          fullWidth={fullWidth}
        >
          <LazyBaseEditor {...props} useDarkTheme={darkMode} transparentBackground />
        </EuiFormControlLayout>
      </React.Suspense>
    </EuiErrorBoundary>
  );
};

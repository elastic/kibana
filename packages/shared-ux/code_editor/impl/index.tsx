/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { euiLightVars as lightTheme, euiDarkVars as darkTheme } from '@kbn/ui-theme';
import {
  EuiDelayRender,
  EuiSkeletonText,
  EuiFormControlLayout,
  EuiErrorBoundary,
  useEuiTheme,
} from '@elastic/eui';
import type { CodeEditorProps } from './code_editor';
export type { CodeEditorProps } from './code_editor';
export * from './languages/constants';

const LazyCodeEditorBase = React.lazy(() =>
  import(/* webpackChunkName: "code-editor-entry" */ './code_editor').then((m) => ({
    default: m.CodeEditor,
  }))
);

const Fallback: React.FunctionComponent<{ height: CodeEditorProps['height'] }> = ({ height }) => {
  return (
    <>
      {/* when height is known, set minHeight to avoid layout shift */}
      <div style={{ ...(height ? { minHeight: height } : {}), width: '100%' }}>
        <EuiDelayRender>
          <EuiSkeletonText lines={3} />
        </EuiDelayRender>
      </div>
    </>
  );
};

/**
 * Renders a Monaco code editor with EUI color theme.
 *
 * @see CodeEditorField to render a code editor in the same style as other EUI form fields.
 */
export const CodeEditor: React.FunctionComponent<CodeEditorProps> = (props) => {
  return (
    <EuiErrorBoundary>
      <React.Suspense fallback={<Fallback height={props.height} />}>
        <LazyCodeEditorBase {...props} />
      </React.Suspense>
    </EuiErrorBoundary>
  );
};

/**
 * Renders a Monaco code editor in the same style as other EUI form fields.
 */
export const CodeEditorField: React.FunctionComponent<CodeEditorProps> = (props) => {
  const { width, height, options, fullWidth, useDarkTheme: useDarkThemeProp } = props;
  const { colorMode } = useEuiTheme();
  const useDarkTheme = useDarkThemeProp ?? colorMode === 'DARK';
  const theme = useDarkTheme ? darkTheme : lightTheme;

  const style = {
    width,
    height,
    backgroundColor: options?.readOnly
      ? theme.euiFormBackgroundReadOnlyColor
      : theme.euiFormBackgroundColor,
  };

  return (
    <EuiErrorBoundary>
      <React.Suspense fallback={<Fallback height={props.height} />}>
        <EuiFormControlLayout
          append={<div hidden />}
          style={style}
          readOnly={options?.readOnly}
          fullWidth={fullWidth}
        >
          <LazyCodeEditorBase {...props} transparentBackground />
        </EuiFormControlLayout>
      </React.Suspense>
    </EuiErrorBoundary>
  );
};

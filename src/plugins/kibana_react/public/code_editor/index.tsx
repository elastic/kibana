/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiDelayRender, EuiErrorBoundary, EuiSkeletonText, useEuiTheme } from '@elastic/eui';

import type { Props } from './code_editor';

export * from '@kbn/code-editor/languages/constants';

const LazyBaseEditor = React.lazy(() => import('./code_editor'));
const LazyCodeEditorField = React.lazy(() =>
  import('./code_editor_field').then((m) => ({ default: m.CodeEditorField }))
);

const Fallback: React.FunctionComponent<{ height: Props['height'] }> = ({ height }) => {
  return (
    <>
      {/* when height is known, set minHeight to avoid layout shift */}
      <div style={height ? { minHeight: height } : {}}>
        <EuiDelayRender>
          <EuiSkeletonText lines={3} />
        </EuiDelayRender>
      </div>
    </>
  );
};

export type CodeEditorProps = Props;

/**
 * Renders a Monaco code editor with EUI color theme.
 *
 * @see CodeEditorField to render a code editor in the same style as other EUI form fields.
 */
export const CodeEditor: React.FunctionComponent<Props> = (props) => {
  const { colorMode } = useEuiTheme();

  return (
    <EuiErrorBoundary>
      <React.Suspense fallback={<Fallback height={props.height} />}>
        <LazyBaseEditor {...props} useDarkTheme={colorMode === 'DARK'} />
      </React.Suspense>
    </EuiErrorBoundary>
  );
};

/**
 * Renders a Monaco code editor in the same style as other EUI form fields.
 */
export const CodeEditorField: React.FunctionComponent<Props> = (props) => {
  const { colorMode } = useEuiTheme();

  return (
    <EuiErrorBoundary>
      <React.Suspense fallback={<Fallback height={props.height} />}>
        <LazyCodeEditorField {...props} useDarkTheme={colorMode === 'DARK'} />
      </React.Suspense>
    </EuiErrorBoundary>
  );
};

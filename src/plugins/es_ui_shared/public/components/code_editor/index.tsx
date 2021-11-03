/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiLoadingContentProps, EuiLoadingContent } from '@elastic/eui';
import type { EuiCodeEditorProps } from './code_editor';

const Placeholder = ({ height }: { height?: string }) => {
  const numericalHeight = height ? parseInt(height, 10) : 0;
  // The height of one EuiLoadingContent line is 24px.
  const lineHeight = 24;
  const calculatedLineCount =
    numericalHeight < lineHeight ? 1 : Math.floor(numericalHeight / lineHeight);
  const lines = Math.min(10, calculatedLineCount);

  return <EuiLoadingContent lines={lines as EuiLoadingContentProps['lines']} />;
};

const LazyEuiCodeEditor = React.lazy(() => import('./code_editor'));

export const EuiCodeEditor = (props: EuiCodeEditorProps) => (
  <React.Suspense fallback={<Placeholder height={props.height} />}>
    <LazyEuiCodeEditor {...props} />
  </React.Suspense>
);

export type { EuiCodeEditorProps } from './code_editor';

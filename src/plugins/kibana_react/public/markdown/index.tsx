/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiLoadingContent, EuiDelayRender } from '@elastic/eui';
import type { MarkdownSimpleProps } from './markdown_simple';
import type { MarkdownProps } from './markdown';

const Fallback = () => (
  <EuiDelayRender>
    <EuiLoadingContent lines={3} />
  </EuiDelayRender>
);

const LazyMarkdownSimple = React.lazy(() => import('./markdown_simple'));
export const MarkdownSimple = (props: MarkdownSimpleProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyMarkdownSimple {...props} />
  </React.Suspense>
);

const LazyMarkdown = React.lazy(() => import('./markdown'));
export const Markdown = (props: MarkdownProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyMarkdown {...props} />
  </React.Suspense>
);

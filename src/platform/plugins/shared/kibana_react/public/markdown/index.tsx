/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSkeletonText, EuiDelayRender } from '@elastic/eui';
import type { MarkdownSimpleProps } from './markdown_simple';
import type { MarkdownProps } from './markdown';

const Fallback = () => (
  <EuiDelayRender>
    <EuiSkeletonText lines={3} />
  </EuiDelayRender>
);

/** @deprecated use `Markdown` from `@kbn/shared-ux-markdown` */
const LazyMarkdownSimple = React.lazy(() => import('./markdown_simple'));
export const MarkdownSimple = (props: MarkdownSimpleProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyMarkdownSimple {...props} />
  </React.Suspense>
);

/** @deprecated use `Markdown` from `@kbn/shared-ux-markdown` */
const LazyMarkdown = React.lazy(() => import('./markdown'));
export const Markdown = (props: MarkdownProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyMarkdown {...props} />
  </React.Suspense>
);

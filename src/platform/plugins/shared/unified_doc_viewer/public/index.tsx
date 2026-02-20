/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UnifiedDocViewerPublicPlugin } from './plugin';

export type { UnifiedDocViewerSetup, UnifiedDocViewerStart } from './plugin';

export { useEsDocSearch } from './hooks';
export { UnifiedDocViewer } from './components/lazy_doc_viewer';
export type { UnifiedDocViewerFlyoutProps } from './components/doc_viewer_flyout/doc_viewer_flyout';
export { UnifiedDocViewerFlyout } from './components/lazy_doc_viewer_flyout';
export const plugin = () => new UnifiedDocViewerPublicPlugin();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import { EuiDelayRender, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import type { JsonCodeEditorProps } from './components';
import { UnifiedDocViewerPublicPlugin } from './plugin';

export type { UnifiedDocViewerSetup, UnifiedDocViewerStart } from './plugin';
export { UnifiedDocViewer } from './components';

const LazyJsonCodeEditor = React.lazy(
  () => import('./components/json_code_editor/json_code_editor')
);

export const JsonCodeEditor = withSuspense<JsonCodeEditorProps>(
  LazyJsonCodeEditor,
  <EuiDelayRender delay={300}>
    <EuiPanel color="transparent" paddingSize="s">
      <EuiLoadingSpinner size="m" />
    </EuiPanel>
  </EuiDelayRender>
);

export { useEsDocSearch, useUnifiedDocViewerServices } from './hooks';

export const plugin = () => new UnifiedDocViewerPublicPlugin();

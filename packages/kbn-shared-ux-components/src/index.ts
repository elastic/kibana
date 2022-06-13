/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';

export { ToolbarButton, IconButtonGroup, AddFromLibraryButton, ToolbarPopover } from './toolbar';
export { KibanaPageTemplateSolutionNav } from './page_template/solution_nav';
export type { KibanaPageTemplateProps } from './page_template';
export { KibanaPageTemplate } from './page_template';

/**
 *  A `KibanaNoDataPage` component, with service hooks. Consumers should use `React.Suspennse` or the
 * `withSuspense` HOC to load this component.
 */
export const KibanaNoDataPageLazy = React.lazy(() =>
  import('./empty_state').then(({ KibanaNoDataPage }) => ({
    default: KibanaNoDataPage,
  }))
);

/**
 * A `KibanaNoDataPage` component. The component is wrapped by the `withSuspense` HOC.
 * This component can be used directly by consumers and will load the `KibanaNoDataPageLazy` lazily with
 * a predefined fallback and error boundary.
 */
export const KibanaNoDataPage = withSuspense(KibanaNoDataPageLazy);

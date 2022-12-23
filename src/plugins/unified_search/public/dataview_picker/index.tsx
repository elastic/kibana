/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';

export type { DataViewPickerProps } from './data_view_picker';

/**
 * The Lazily-loaded `DataViewsList` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export const DataViewsListLazy = React.lazy(() => import('./dataview_list'));

/**
 * A `DataViewsList` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `DataViewsLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const DataViewsList = withSuspense(DataViewsListLazy);

/**
 * The Lazily-loaded `DataViewSelector` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export const DataViewSelectorLazy = React.lazy(() => import('./data_view_selector'));

/**
 * A `DataViewSelector` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `DataViewSelectorLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const DataViewSelector = withSuspense(DataViewSelectorLazy);

/**
 * The Lazily-loaded `DataViewPicker` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export const DataViewPickerLazy = React.lazy(() => import('./data_view_picker'));

/**
 * A `DataViewPicker` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `DataViewPickerLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const DataViewPicker = withSuspense(DataViewPickerLazy);

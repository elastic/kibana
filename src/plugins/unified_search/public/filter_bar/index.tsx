/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';

const FilterBarLazy = React.lazy(() => import('./filter_bar'));
export const FilterBar = withSuspense(FilterBarLazy);

const FilterLabelLazy = React.lazy(() => import('./filter_editor/lib/filter_label'));
export const FilterLabel = withSuspense(FilterLabelLazy);

const FilterItemLazy = React.lazy(() => import('./filter_item'));
export const FilterItem = withSuspense(FilterItemLazy);

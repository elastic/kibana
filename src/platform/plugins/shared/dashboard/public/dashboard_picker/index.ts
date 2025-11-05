/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

export const LazyDashboardPicker = React.lazy(() => import('./dashboard_picker'));

export const LazySavedObjectSaveModalDashboard = React.lazy(
  () => import('./saved_object_save_modal_dashboard')
);

/**
 * Used with `showSaveModal` to pass `SaveResult` back from `onSave`
 */
export const LazySavedObjectSaveModalDashboardWithSaveResult = React.lazy(
  () => import('./saved_object_save_modal_dashboard_with_save_result')
);
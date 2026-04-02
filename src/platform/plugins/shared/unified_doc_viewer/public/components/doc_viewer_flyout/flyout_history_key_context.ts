/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';

/**
 * Provides the EUI flyout `historyKey` symbol shared between the Document Viewer
 * flyout and any nested flyouts (e.g. Trace Waterfall) that should participate
 * in the same back-button navigation history group.
 *
 * The context is provided by `UnifiedDocViewerFlyout` and consumed by
 * `FullScreenWaterfall` so that the two flyouts share a history stack,
 * enabling the "Back" button on the Trace Waterfall to return the user to
 * the Document Viewer.
 */
export const FlyoutHistoryKeyContext = createContext<symbol | undefined>(undefined);

export const useFlyoutHistoryKey = () => {
  // Don't be strict: if the context wasn't provided, just return undefined.
  return useContext(FlyoutHistoryKeyContext);
};

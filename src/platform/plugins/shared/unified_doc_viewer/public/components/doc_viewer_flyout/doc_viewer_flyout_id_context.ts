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
 * Provides the id of the `UnifiedDocViewerFlyout` instance to the doc views, header and footer it
 * renders, so state they keep outside React can be tied to one doc viewer: the id changes when the
 * doc viewer closes and reopens, even for the same document.
 */
export const DocViewerFlyoutIdContext = createContext<string | undefined>(undefined);

/** Returns the id of the enclosing doc viewer flyout, or undefined outside of one. */
export const useDocViewerFlyoutId = (): string | undefined => useContext(DocViewerFlyoutIdContext);

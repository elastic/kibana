/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';

export type HostColorMode = 'light' | 'dark';

/**
 * Color mode of the host page, captured outside the toolbar's own dark `EuiThemeProvider`.
 * Toolbar items use it for UI that renders over the page (e.g. flyouts).
 */
export const HostColorModeContext = createContext<HostColorMode | undefined>(undefined);

/** Returns the host page color mode, or `undefined` outside a `DeveloperToolbar`. */
export const useHostColorMode = (): HostColorMode | undefined => useContext(HostColorModeContext);

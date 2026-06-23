/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';

import { SIDE_PANEL_WIDTH } from '../hooks/use_layout_width';

const SidePanelWidthContext = createContext(SIDE_PANEL_WIDTH);

export const SidePanelWidthProvider = SidePanelWidthContext.Provider;

/** Returns the current secondary navigation side panel width in pixels. */
export const useSidePanelWidthValue = (): number => useContext(SidePanelWidthContext);

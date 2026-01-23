/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';

interface NestedMenuContextValue {
  /**
   * Whether the menu can go back to a previous panel.
   * Used to display the "Go back" button in the header.
   */
  canGoBack: boolean;
  /**
   * The ID of the currently open panel.
   */
  currentPanel: string;
  /**
   * Navigate back to the previous panel.
   */
  goBack: () => void;
  /**
   * Navigate to a specific panel by its ID.
   *
   * @param panelId - the ID of the panel to open.
   * @param returnFocusId - (optional) the ID of the element to return focus to.
   */
  goToPanel: (panelId: string, returnFocusId?: string) => void;
  /**
   * How deep into the panel stack the menu currently is (0 = root panel).
   */
  panelStackDepth: number;
  /**
   * (optional) The unique identifier of the element to return focus to when navigating back.
   */
  returnFocusId?: string;
}

export const NestedMenuContext = createContext<NestedMenuContextValue | null>(null);

export const useNestedMenu = () => {
  const context = useContext(NestedMenuContext);
  if (!context) {
    throw new Error('useNestedMenu must be used within a NestedSecondaryMenu');
  }
  return context;
};

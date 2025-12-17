/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

export interface AppMenuProps {
  /**
   * The setAppMenu function from ChromeStart.
   * Typically accessed via `core.chrome.setAppMenu` or `coreStart.chrome.setAppMenu`.
   */
  setAppMenu: (config?: AppMenuConfig) => void;
  /**
   * The app menu configuration to display in the chrome header.
   * When undefined, clears the app menu.
   */
  config?: AppMenuConfig;
}

/**
 * A declarative React component for managing the application menu in Kibana's chrome header.
 *
 * This component automatically:
 * - Calls `setAppMenu(config)` when mounted or when config changes
 * - Clears the menu with `setAppMenu()` when unmounted
 *
 * @example
 * ```tsx
 * import { AppMenu } from '@kbn/core-chrome-app-menu';
 *
 * function MyApp({ core }) {
 *   return (
 *       <AppMenu
 *         setAppMenu={core.chrome.setAppMenu}
 *         config={{
 *           items: [
 *             {
 *               id: 'save',
 *               label: 'Save',
 *               iconType: 'save',
 *               run: () => handleSave(),
 *             },
 *           ],
 *         }}
 *       />
 *   );
 * }
 * ```
 */
export const AppMenu = ({ setAppMenu, config }: AppMenuProps) => {
  useEffect(() => {
    setAppMenu(config);

    return () => {
      setAppMenu();
    };
  }, [config, setAppMenu]);

  return null;
};

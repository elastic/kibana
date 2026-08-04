import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
export interface AppMenuProps {
    /**
     * The setAppMenu function from ChromeStart.
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
 * @example
 * ```tsx
 * import React, { useEffect } from 'react';
 * import { AppMenu } from '@kbn/core-chrome-app-menu';
 * import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
 * import type { CoreStart } from '@kbn/core/public';
 *
 *interface Props {
 *  config: AppMenuConfig;
 *  core: CoreStart;
 *}
 *
 *const Example = ({ config, core }: Props) => {
 *  const { chrome } = core;
 *
 *  return <AppMenu config={config} setAppMenu={chrome.setAppMenu} />;
 *};
 *```
 */
export declare const AppMenu: ({ setAppMenu, config }: AppMenuProps) => null;

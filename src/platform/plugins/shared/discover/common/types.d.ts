import type { NEW_TAB_ID } from './constants';
export interface TabsUrlState {
    /**
     * Syncing the selected tab id with the URL
     */
    tabId?: typeof NEW_TAB_ID | string;
    /**
     * (Optional) Label for the tab, used when creating a new tab via locator URL or opening a shared link.
     */
    tabLabel?: string;
}

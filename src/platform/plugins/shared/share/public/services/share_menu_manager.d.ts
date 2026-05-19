import type { CoreStart } from '@kbn/core/public';
import type { InjectedIntl } from '@kbn/i18n-react';
import type { ShowShareMenuOptions } from '../types';
import type { ShareRegistry } from './share_menu_registry';
interface ShareMenuManagerStartDeps {
    core: CoreStart;
    isServerless: boolean;
    resolveShareItemsForShareContext: ShareRegistry['resolveShareItemsForShareContext'];
}
export declare class ShareMenuManager {
    private isOpen;
    private container;
    start({ core, resolveShareItemsForShareContext, isServerless }: ShareMenuManagerStartDeps): {
        /**
         * Collects share menu items from registered providers and mounts the share context menu under
         * the given `anchorElement`. If the context menu is already opened, a call to this method closes it.
         * @param options
         */
        toggleShareContextMenu: (options: ShowShareMenuOptions) => Promise<void>;
        /**
         * Returns a handler to trigger a specific export integration by ID.
         * For direct exports, executes immediately; otherwise opens a flyout.
         */
        getExportHandler: (options: Omit<ShowShareMenuOptions, "asExport" | "anchorElement">, exportId: string, intl: InjectedIntl) => Promise<(() => Promise<void>) | null>;
        /**
         * Returns a handler to trigger an export derivative by ID, opening its custom flyout.
         */
        getExportDerivativeHandler: (options: Omit<ShowShareMenuOptions, "asExport" | "anchorElement">, derivativeId: string) => Promise<(() => Promise<void>) | null>;
    };
    /**
     * Method for handling export operations flexibly.
     */
    private createExportHandler;
    private onClose;
    private toggleShareContextMenu;
}
export type ShareMenuManagerStart = ReturnType<ShareMenuManager['start']>;
export {};

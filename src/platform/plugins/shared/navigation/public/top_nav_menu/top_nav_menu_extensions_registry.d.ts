import type { RegisteredTopNavMenuData } from './top_nav_menu_data';
/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export declare class TopNavMenuExtensionsRegistry {
    private menuItems;
    constructor();
    /**
     * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
     */
    register(menuItem: RegisteredTopNavMenuData): void;
    /** @internal **/
    getAll(): RegisteredTopNavMenuData[];
    /** @internal **/
    clear(): void;
}
/**
 * @deprecated Use AppMenu from "@kbn/core-chrome-app-menu" instead
 */
export type TopNavMenuExtensionsRegistrySetup = Pick<TopNavMenuExtensionsRegistry, 'register'>;

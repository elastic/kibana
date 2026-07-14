import type { AppMenuConfig, AppMenuStaticItem } from '@kbn/core-chrome-app-menu-components';
export declare function useAppHeaderMenu(pageAppMenu: AppMenuConfig | undefined, docLink?: string, showAddIntegrations?: boolean): {
    config: AppMenuConfig | undefined;
    staticItems: AppMenuStaticItem[];
};
export interface ShareAction {
    onClick: (triggerElement: HTMLElement) => void;
    tooltipContent?: string;
    tooltipTitle?: string;
    testId?: string;
    isDisabled?: boolean;
}
export declare function useShareAction(pageAppMenu: AppMenuConfig | undefined): ShareAction | undefined;

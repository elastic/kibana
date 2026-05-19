import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverCustomizationContext } from '../../../../customizations';
import type { DiscoverServices } from '../../../../build_services';
/** Standalone Discover with tabs: Inspect is on the tab menu, not the top nav. */
export declare const isDiscoverInspectorInTabMenu: (services: DiscoverServices, customizationContext: DiscoverCustomizationContext) => boolean;
/** Embedded / by-value: top nav shows Inspect; mounts {@link useInspector}. */
export declare const useDiscoverTopNavWithInspector: ({ onOpenSaveModal, onOpenSaveAsModal, persistedDiscoverSession, }: {
    onOpenSaveModal: () => void;
    onOpenSaveAsModal: () => void;
    persistedDiscoverSession: DiscoverSession | undefined;
}) => {
    topNavMenu: import("@kbn/core/packages/chrome/app-menu/core-chrome-app-menu-components").AppMenuConfig;
    topNavBadges: import("@kbn/core/packages/chrome/browser").ChromeBreadcrumbsBadge[];
};
/** Standalone tabbed Discover: Inspect is on the tab menu only — do not mount {@link useInspector}. */
export declare const useDiscoverTopNavWithoutInspector: ({ onOpenSaveModal, onOpenSaveAsModal, persistedDiscoverSession, }: {
    persistedDiscoverSession: DiscoverSession | undefined;
    onOpenSaveModal: () => void;
    onOpenSaveAsModal: () => void;
}) => {
    topNavMenu: import("@kbn/core/packages/chrome/app-menu/core-chrome-app-menu-components").AppMenuConfig;
    topNavBadges: import("@kbn/core/packages/chrome/browser").ChromeBreadcrumbsBadge[];
};
export type DiscoverTopNavHookResult = ReturnType<typeof useDiscoverTopNavWithInspector>;

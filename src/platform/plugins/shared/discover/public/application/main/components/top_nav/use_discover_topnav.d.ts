import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
export declare const useDiscoverTopNav: ({ onOpenSaveModal, onOpenSaveAsModal, persistedDiscoverSession, }: {
    onOpenSaveModal: () => void;
    onOpenSaveAsModal: () => void;
    persistedDiscoverSession: DiscoverSession | undefined;
}) => {
    topNavMenu: import("@kbn/core/packages/chrome/app-menu/core-chrome-app-menu-components").AppMenuConfig;
    topNavBadges: import("@kbn/core/packages/chrome/browser").ChromeBreadcrumbsBadge[];
};
export type DiscoverTopNavHookResult = ReturnType<typeof useDiscoverTopNav>;

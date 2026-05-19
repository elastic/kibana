import type { DataView } from '@kbn/data-views-plugin/public';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverServices } from '../../../../build_services';
/**
 * Helper function to build the top nav links
 */
export declare const useTopNavLinks: ({ dataView, services, onOpenInspector, hasUnsavedChanges, isEsqlMode, adHocDataViews, hasShareIntegration, persistedDiscoverSession, onOpenSaveModal, onOpenSaveAsModal, }: {
    dataView: DataView | undefined;
    services: DiscoverServices;
    onOpenInspector?: () => void;
    hasUnsavedChanges: boolean;
    isEsqlMode: boolean;
    adHocDataViews: DataView[];
    hasShareIntegration: boolean;
    persistedDiscoverSession: DiscoverSession | undefined;
    onOpenSaveModal: () => void;
    onOpenSaveAsModal: () => void;
}) => AppMenuConfig;

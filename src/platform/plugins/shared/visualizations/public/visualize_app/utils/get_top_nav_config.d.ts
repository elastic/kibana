import type EventEmitter from 'events';
import type { Capabilities } from '@kbn/core/public';
import type { TopNavMenuData } from '@kbn/navigation-plugin/public';
import type { EmbeddableStateTransfer, EmbeddableEditorBreadcrumb } from '@kbn/embeddable-plugin/public';
import type { VisualizeServices, VisualizeAppStateContainer, VisualizeEditorVisInstance } from '../types';
export interface TopNavConfigParams {
    hasUnsavedChanges: boolean;
    setHasUnsavedChanges: (value: boolean) => void;
    openInspector: () => void;
    originatingApp?: string;
    originatingPath?: string;
    incomingBreadcrumbs?: EmbeddableEditorBreadcrumb[];
    setOriginatingApp?: (originatingApp: string | undefined) => void;
    hasUnappliedChanges: boolean;
    visInstance: VisualizeEditorVisInstance;
    stateContainer: VisualizeAppStateContainer;
    visualizationIdFromUrl?: string;
    stateTransfer: EmbeddableStateTransfer;
    embeddableId?: string;
    displayEditInLensItem: boolean;
    hideLensBadge: () => void;
    setNavigateToLens: (flag: boolean) => void;
    showBadge: boolean;
    eventEmitter?: EventEmitter;
}
export declare const showPublicUrlSwitch: (anonymousUserCapabilities: Capabilities) => boolean;
export declare const getTopNavConfig: ({ hasUnsavedChanges, setHasUnsavedChanges, openInspector, originatingApp, originatingPath, incomingBreadcrumbs, setOriginatingApp, hasUnappliedChanges, visInstance, stateContainer, visualizationIdFromUrl, stateTransfer, embeddableId, displayEditInLensItem, hideLensBadge, setNavigateToLens, showBadge, eventEmitter, }: TopNavConfigParams, { data, application, chrome, history, share, setActiveUrl, toastNotifications, visualizeCapabilities, dashboardCapabilities, savedObjectsTagging, presentationUtil, getKibanaVersion, serverless, ...startServices }: VisualizeServices) => TopNavMenuData[];

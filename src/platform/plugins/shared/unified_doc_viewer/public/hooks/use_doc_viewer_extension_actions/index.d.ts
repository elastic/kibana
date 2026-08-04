import type { DocViewActions } from '@kbn/unified-doc-viewer/src/services/types';
interface UseDocViewerExtensionActionsParams {
    actions?: DocViewActions;
}
export declare const DocViewerExtensionActionsProvider: import("react").FC<import("react").PropsWithChildren<UseDocViewerExtensionActionsParams>>, useDocViewerExtensionActionsContext: () => DocViewActions | undefined;
export {};

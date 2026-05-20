import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ApplicationStart, PublicAppInfo } from '@kbn/core/public';
import type { EmbeddableEditorState, EmbeddablePackageState } from './types';
export declare const EMBEDDABLE_STATE_TRANSFER_STORAGE_KEY = "EMBEDDABLE_STATE_TRANSFER";
/**
 * A wrapper around the session storage which provides strongly typed helper methods
 * for common incoming and outgoing states used by the embeddable infrastructure.
 *
 * @public
 */
export declare class EmbeddableStateTransfer {
    private navigateToApp;
    isTransferInProgress: boolean;
    private storage;
    private appList;
    private incomingPackagesState$;
    constructor(navigateToApp: ApplicationStart['navigateToApp'], currentAppId$: ApplicationStart['currentAppId$'], appList?: ReadonlyMap<string, PublicAppInfo> | undefined, customStorage?: Storage);
    /**
     * Fetches an internationalized app title when given an appId.
     * @param appId - The id of the app to fetch the title for
     */
    getAppNameFromId: (appId: string) => string | undefined;
    private getStorageState;
    /**
     * Fetches an {@link EmbeddableEditorState | editor state} from the sessionStorage for the provided app id
     *
     * @param appId - The app to fetch incomingEditorState for
     * @param removeAfterFetch - Whether to remove the package state after fetch to prevent duplicates.
     */
    getIncomingEditorState(appId: string, removeAfterFetch?: boolean): EmbeddableEditorState | undefined;
    /**
     * Clears the {@link EmbeddableEditorState | editor state} from the sessionStorage for the provided app id
     *
     * @param appId - The app to fetch incomingEditorState for
     * @param removeAfterFetch - Whether to remove the package state after fetch to prevent duplicates.
     */
    clearEditorState(appId?: string): void;
    /**
     * Fetches an {@link EmbeddablePackageState | embeddable package} from the sessionStorage for the given AppId
     *
     * @param appId - The app to fetch EmbeddablePackageState for
     * @param removeAfterFetch - Whether to remove the package state after fetch to prevent duplicates.
     */
    getIncomingEmbeddablePackage(appId: string, removeAfterFetch?: boolean): EmbeddablePackageState[] | undefined;
    /**
     * A wrapper around the {@link ApplicationStart.navigateToApp} method which navigates to the specified appId
     * with {@link EmbeddableEditorState | embeddable editor state}
     */
    navigateToEditor(appId: string, options?: {
        path?: string;
        openInNewTab?: boolean;
        skipAppLeave?: boolean;
        state: EmbeddableEditorState;
    }): Promise<void>;
    /**
     * A wrapper around the {@link ApplicationStart.navigateToApp} method which navigates to the specified appId
     * with multiple {@link EmbeddablePackageState | embeddable package state}
     */
    navigateToWithEmbeddablePackages<SerializedStateType extends object = object>(appId: string, options?: {
        path?: string;
        state: Array<EmbeddablePackageState<SerializedStateType>>;
    }): Promise<void>;
    private removeKeysFromStorage;
    /**
     * Retrieves incoming embeddable package states from session storage, handling arrays.
     * Always returns an array format. Filters results using the provided type guard.
     *
     * @param guard - Type guard function to validate state items
     * @param appId - The application ID to fetch state for
     * @param key - The storage key to retrieve state from
     * @param options - Optional configuration including keys to remove after fetch
     * @returns Array of valid package states, or undefined if no valid states found
     */
    private getIncomingPackagesState;
    private navigateToWithState;
    onTransferEmbeddablePackage$(appId: string, removeAfterFetch?: boolean): import("rxjs").Observable<EmbeddablePackageState<object>[] | undefined>;
}

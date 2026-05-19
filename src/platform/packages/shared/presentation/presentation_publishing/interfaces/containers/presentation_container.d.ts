import type { Observable } from 'rxjs';
import type { PublishingSubject } from '../../publishing_subject';
import type { CanAddNewPanel } from './can_add_new_panel';
import type { CanAddNewSection } from './can_add_new_section';
export interface PanelPackage<SerializedState extends object = object> {
    panelType: string;
    maybePanelId?: string;
    /**
     * The serialized state of this panel.
     */
    serializedState?: SerializedState;
}
export interface PresentationContainer<ApiType extends unknown = unknown> extends CanAddNewPanel {
    /**
     * Removes a panel from the container.
     */
    removePanel: (panelId: string) => void;
    /**
     * Determines whether or not a container is capable of removing panels.
     */
    canRemovePanels?: () => boolean;
    /**
     * Replaces a panel in the container with a new panel.
     */
    replacePanel: <SerializedState extends object = object>(idToRemove: string, newPanel: PanelPackage<SerializedState>) => Promise<string>;
    /**
     * Returns the number of panels in the container.
     */
    getPanelCount: () => number;
    /**
     * Gets a child API for the given ID. This is asynchronous and should await for the
     * child API to be available. It is best practice to retrieve a child API using this method
     */
    getChildApi: (uuid: string) => Promise<ApiType | undefined>;
    /**
     * A publishing subject containing the child APIs of the container. Note that
     * children are created asynchronously. This means that the children$ observable might
     * contain fewer children than the actual number of panels in the container. Use getChildApi
     * to retrieve the child API for a specific panel.
     */
    children$: PublishingSubject<{
        [key: string]: ApiType;
    }>;
}
export declare const apiIsPresentationContainer: (api: unknown | null) => api is PresentationContainer;
export interface HasSections extends CanAddNewSection {
    getPanelSection: (uuid: string) => string | undefined;
    panelSection$: (uuid: string) => Observable<string | undefined>;
}
export declare const apiHasSections: (api: unknown) => api is HasSections;
export declare const apiPublishesChildren: (api: unknown | null) => api is Pick<PresentationContainer, "children$">;
export declare const getContainerParentFromAPI: (api: null | unknown) => PresentationContainer | undefined;
export declare const listenForCompatibleApi: <ApiType extends unknown>(parent: unknown, isCompatible: (api: unknown) => api is ApiType, apiFound: (api: ApiType | undefined) => (() => void) | void) => () => void;
export declare const combineCompatibleChildrenApis: <ApiType extends unknown, PublishingSubjectType>(api: unknown, observableKey: keyof ApiType, isCompatible: (api: unknown) => api is ApiType, emptyState: PublishingSubjectType, flattenMethod?: (array: PublishingSubjectType[]) => PublishingSubjectType) => Observable<PublishingSubjectType>;

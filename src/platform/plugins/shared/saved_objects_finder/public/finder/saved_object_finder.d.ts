import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { IconType } from '@elastic/eui';
import { Query } from '@elastic/eui';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { type EuiTablePersistInjectedProps } from '@kbn/shared-ux-table-persist/src';
import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { FinderAttributes, SavedObjectCommon } from '../../common';
export interface SavedObjectMetaData<T extends FinderAttributes = FinderAttributes> {
    type: string;
    name: string;
    getIconForSavedObject(savedObject: SavedObjectCommon<T>): IconType;
    getTooltipForSavedObject?(savedObject: SavedObjectCommon<T>): string;
    showSavedObject?(savedObject: SavedObjectCommon<T>): boolean;
    getSavedObjectSubType?(savedObject: SavedObjectCommon<T>): string;
    /** @deprecated doesn't do anything, the full object is returned **/
    includeFields?: string[];
}
export interface SavedObjectFinderItem extends SavedObjectCommon {
    title: string | null;
    name: string | null;
    simple: SavedObjectCommon<FinderAttributes>;
}
interface SavedObjectFinderState {
    items: SavedObjectFinderItem[];
    query: Query;
    isFetchingItems: boolean;
}
interface SavedObjectFinderServices {
    savedObjectsTagging?: SavedObjectsTaggingApi;
    contentClient: ContentClient;
    uiSettings: IUiSettingsClient;
}
interface BaseSavedObjectFinder {
    id: string;
    services: SavedObjectFinderServices;
    onChoose?: (id: SavedObjectCommon['id'], type: SavedObjectCommon['type'], name: string, savedObject: SavedObjectCommon) => void;
    getHref?: (id: SavedObjectCommon['id'], type: SavedObjectCommon['type']) => string | undefined;
    noItemsMessage?: ReactNode;
    savedObjectMetaData: Array<SavedObjectMetaData<FinderAttributes>>;
    extraItems?: {
        metaData: Array<SavedObjectMetaData<FinderAttributes>>;
        get: (search: SearchQuery) => Promise<SavedObjectCommon<FinderAttributes>[]>;
    };
    showFilter?: boolean;
    leftChildren?: ReactElement | ReactElement[];
    children?: ReactElement | ReactElement[];
    helpText?: string;
    tableCaption?: string;
    getTooltipText?: (item: SavedObjectFinderItem) => string | undefined;
}
interface SavedObjectFinderFixedPage extends BaseSavedObjectFinder {
    initialPageSize?: undefined;
    fixedPageSize: number;
}
interface SavedObjectFinderInitialPageSize extends BaseSavedObjectFinder {
    initialPageSize?: 5 | 10 | 15 | 25;
    fixedPageSize?: undefined;
}
export type SavedObjectFinderProps = SavedObjectFinderFixedPage | SavedObjectFinderInitialPageSize;
declare class SavedObjectFinderUiClass extends React.Component<SavedObjectFinderProps & EuiTablePersistInjectedProps<SavedObjectFinderItem>, SavedObjectFinderState> {
    private isComponentMounted;
    private metaDataMap;
    private debouncedFetch;
    constructor(props: SavedObjectFinderProps & EuiTablePersistInjectedProps<SavedObjectFinderItem>);
    componentWillUnmount(): void;
    componentDidMount(): void;
    private getSavedObjectMetaDataMap;
    private fetchItems;
    render(): React.JSX.Element;
}
export declare const SavedObjectFinderUi: React.FC<import("@kbn/shared-ux-table-persist/src").HOCProps<SavedObjectFinderItem, Omit<SavedObjectFinderProps & EuiTablePersistInjectedProps<SavedObjectFinderItem>, "euiTablePersist">>>;
export declare const SavedObjectFinderWithoutPersist: typeof SavedObjectFinderUiClass;
export default SavedObjectFinderUi;

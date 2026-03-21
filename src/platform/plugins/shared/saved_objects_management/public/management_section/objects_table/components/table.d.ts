import type { ApplicationStart, IBasePath } from '@kbn/core/public';
import React, { PureComponent } from 'react';
import type { QueryType, CriteriaWithPagination } from '@elastic/eui';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SavedObjectManagementTypeInfo } from '../../../../common/types';
import type { SavedObjectWithMetadata } from '../../../types';
import type { SavedObjectsManagementActionServiceStart, SavedObjectsManagementAction, SavedObjectsManagementColumnServiceStart } from '../../../services';
export type ItemId<T> = string | number | ((item: T) => string);
export interface TableProps {
    taggingApi?: SavedObjectsTaggingApi;
    basePath: IBasePath;
    allowedTypes: SavedObjectManagementTypeInfo[];
    actionRegistry: SavedObjectsManagementActionServiceStart;
    columnRegistry: SavedObjectsManagementColumnServiceStart;
    selectedSavedObjects: SavedObjectWithMetadata[];
    selectionConfig: {
        onSelectionChange: (selection: SavedObjectWithMetadata[]) => void;
    };
    filterOptions: any[];
    capabilities: ApplicationStart['capabilities'];
    onDelete: () => void;
    onActionRefresh: (objects: Array<{
        type: string;
        id: string;
    }>) => void;
    onExport: (includeReferencesDeep: boolean) => void;
    goInspectObject: (obj: SavedObjectWithMetadata) => void;
    pageIndex: number;
    pageSize: number;
    sort: CriteriaWithPagination<SavedObjectWithMetadata>['sort'];
    items: SavedObjectWithMetadata[];
    itemId: ItemId<SavedObjectWithMetadata>;
    totalItemCount: number;
    onQueryChange: (query: any) => void;
    onTableChange: (table: any) => void;
    isSearching: boolean;
    onShowRelationships: (object: SavedObjectWithMetadata) => void;
    canGoInApp: (obj: SavedObjectWithMetadata) => boolean;
    initialQuery?: QueryType;
    deleteButtonRef?: React.RefObject<HTMLButtonElement>;
}
interface TableState {
    isSearchTextValid: boolean;
    parseErrorMessage: any;
    isExportPopoverOpen: boolean;
    isIncludeReferencesDeepChecked: boolean;
    activeAction?: SavedObjectsManagementAction;
}
export declare class Table extends PureComponent<TableProps, TableState> {
    state: TableState;
    constructor(props: TableProps);
    onChange: ({ query, error }: any) => void;
    closeExportPopover: () => void;
    toggleExportPopoverVisibility: () => void;
    toggleIsIncludeReferencesDeepChecked: () => void;
    onExportClick: () => void;
    getUpdatedAtColumn: () => {
        field: string;
        name: string;
        render: (field: string, record: {
            updated_at?: string;
        }) => React.JSX.Element;
        sortable: boolean;
        width: string;
    };
    render(): React.JSX.Element;
}
export {};

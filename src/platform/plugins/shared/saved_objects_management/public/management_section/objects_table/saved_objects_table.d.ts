import React, { Component } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import { Query } from '@elastic/eui';
import type { HttpStart, OverlayStart, NotificationsStart, ApplicationStart } from '@kbn/core/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
import type { SavedObjectManagementTypeInfo } from '../../../common/types/latest';
import type { SavedObjectsExportResultDetails } from '../../lib';
import type { SavedObjectWithMetadata } from '../../types';
import type { SavedObjectsManagementActionServiceStart, SavedObjectsManagementColumnServiceStart } from '../../services';
interface ExportAllOption {
    id: string;
    label: string;
}
export interface SavedObjectsTableProps {
    allowedTypes: SavedObjectManagementTypeInfo[];
    actionRegistry: SavedObjectsManagementActionServiceStart;
    columnRegistry: SavedObjectsManagementColumnServiceStart;
    dataViews: DataViewsContract;
    taggingApi?: SavedObjectsTaggingApi;
    http: HttpStart;
    search: DataPublicPluginStart['search'];
    overlays: OverlayStart;
    notifications: NotificationsStart;
    applications: ApplicationStart;
    perPageConfig: number;
    goInspectObject: (obj: SavedObjectWithMetadata) => void;
    canGoInApp: (obj: SavedObjectWithMetadata) => boolean;
    initialQuery?: Query;
    customBranding: CustomBrandingStart;
}
export interface SavedObjectsTableState {
    totalCount: number;
    page: number;
    perPage: number;
    sort: CriteriaWithPagination<SavedObjectWithMetadata>['sort'];
    savedObjects: SavedObjectWithMetadata[];
    savedObjectCounts: Record<string, number>;
    activeQuery: Query;
    selectedSavedObjects: SavedObjectWithMetadata[];
    isShowingImportFlyout: boolean;
    isSearching: boolean;
    filteredItemCount: number;
    isShowingRelationships: boolean;
    relationshipObject?: SavedObjectWithMetadata;
    isShowingDeleteConfirmModal: boolean;
    isShowingExportAllOptionsModal: boolean;
    isDeleting: boolean;
    exportAllOptions: ExportAllOption[];
    exportAllSelectedOptions: Record<string, boolean>;
    isIncludeReferencesDeepChecked: boolean;
    hasCustomBranding: boolean;
}
export declare class SavedObjectsTable extends Component<SavedObjectsTableProps, SavedObjectsTableState> {
    private _isMounted;
    private hasCustomBrandingSubscription?;
    deleteButtonRef: React.RefObject<HTMLButtonElement>;
    constructor(props: SavedObjectsTableProps);
    componentDidMount(): void;
    componentWillUnmount(): void;
    fetchCounts: () => Promise<void>;
    fetchAllSavedObjects: () => void;
    fetchSavedObjects: (objects: Array<{
        type: string;
        id: string;
    }>) => void;
    debouncedFindObjects: import("lodash").DebouncedFunc<() => Promise<void>>;
    debouncedBulkGetObjects: import("lodash").DebouncedFunc<(objects: Array<{
        type: string;
        id: string;
    }>) => Promise<void>>;
    refreshAllObjects: () => Promise<void>;
    refreshObjects: (objects: Array<{
        type: string;
        id: string;
    }>) => Promise<void>;
    onSelectionChanged: (selection: SavedObjectWithMetadata[]) => void;
    onQueryChange: ({ query }: {
        query: Query;
    }) => void;
    onTableChange: (table: CriteriaWithPagination<SavedObjectWithMetadata>) => Promise<void>;
    onShowRelationships: (object: SavedObjectWithMetadata) => void;
    onHideRelationships: () => void;
    onExport: (includeReferencesDeep: boolean) => Promise<void>;
    onExportAll: () => Promise<void>;
    showExportCompleteMessage: (exportDetails: SavedObjectsExportResultDetails | undefined) => import("@kbn/core/public").Toast;
    finishImport: () => void;
    showImportFlyout: () => void;
    hideImportFlyout: () => void;
    onDelete: () => void;
    delete: () => Promise<void>;
    getRelationships: (type: string, id: string) => Promise<import("../../../common/types/v1").RelationshipsResponseHTTP>;
    renderFlyout(): React.JSX.Element | null;
    renderRelationships(): React.JSX.Element | null;
    renderDeleteConfirmModal(): React.JSX.Element | null;
    renderExportAllOptionsModal(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export {};

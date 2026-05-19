import type { TimeRange } from '@kbn/es-query';
import type { CascadeQueryArgs } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import type { DataTableColumnsMeta, DataTableRecord } from '@kbn/discover-utils';
import { RequestAdapter } from '@kbn/inspector-plugin/public';
import type { DiscoverServices } from '../../../build_services';
import type { ScopedProfilesManager } from '../../../context_awareness';
export interface FetchCascadedDocumentsParams extends CascadeQueryArgs {
    nodeId: string;
    timeRange: TimeRange | undefined;
}
export interface CascadedDocumentsStateManager {
    getIsActiveInstance(): boolean;
    getCascadedDocuments(nodeId: string): DataTableRecord[] | undefined;
    getColumnsMeta(): DataTableColumnsMeta;
    setCascadedDocuments(nodeId: string, records: DataTableRecord[]): void;
    setColumnsMeta(columnsMeta: DataTableColumnsMeta): void;
}
export declare class CascadedDocumentsFetcher {
    private readonly services;
    private readonly scopedProfilesManager;
    private readonly stateManager;
    private readonly abortControllers;
    private readonly requestAdapter;
    constructor(services: DiscoverServices, scopedProfilesManager: ScopedProfilesManager, stateManager: CascadedDocumentsStateManager);
    getRequestAdapter(): RequestAdapter;
    fetchCascadedDocuments({ nodeId, nodeType, nodePath, nodePathMap, query, esqlVariables, dataView, timeRange, }: FetchCascadedDocumentsParams): Promise<DataTableRecord[]>;
    cancelFetch(nodeId: string): void;
    cancelAllFetches(): void;
}

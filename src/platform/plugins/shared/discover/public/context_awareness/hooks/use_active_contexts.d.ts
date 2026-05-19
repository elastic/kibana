import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataSourceContext, RootContext } from '..';
import type { ContextWithProfileId } from '../profile_service';
import { type DataTableRecordWithContext, type ScopedProfilesManager } from '../profiles_manager';
import type { DataDocuments$ } from '../../application/main/state_management/discover_data_state_container';
export interface Contexts {
    rootContext: ContextWithProfileId<RootContext>;
    dataSourceContext: ContextWithProfileId<DataSourceContext>;
    documentContexts: Record<string, DataTableRecordWithContext[]>;
}
export interface ContextsAdapter {
    getRootContext: () => ContextWithProfileId<RootContext>;
    getDataSourceContext: () => ContextWithProfileId<DataSourceContext>;
    getDocumentContexts: () => Record<string, DataTableRecordWithContext[]>;
    openDocDetails: (record: DataTableRecord) => void;
}
/**
 * Pure factory for the inspector Contexts adapter. Used by {@link useActiveContexts} and by
 * callers that cannot use hooks (e.g. tab menu onClick). Must receive the same
 * `scopedProfilesManager` and `dataDocuments$` as the active tab.
 */
export declare const createContextsAdapter: ({ scopedProfilesManager, dataDocuments$, }: {
    scopedProfilesManager: ScopedProfilesManager;
    dataDocuments$: DataDocuments$;
}) => ({ onOpenDocDetails, }: {
    onOpenDocDetails: (record: DataTableRecord) => void;
}) => ContextsAdapter;
export declare function useActiveContexts({ dataDocuments$ }: {
    dataDocuments$: DataDocuments$;
}): ({ onOpenDocDetails, }: {
    onOpenDocDetails: (record: DataTableRecord) => void;
}) => ContextsAdapter;

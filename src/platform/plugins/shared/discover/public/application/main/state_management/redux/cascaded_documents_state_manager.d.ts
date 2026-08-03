import type { CascadedDocumentsStateManager } from '../../data_fetching/cascaded_documents_fetcher';
import type { InternalStateStore } from './internal_state';
export declare const createCascadedDocumentsStateManager: ({ internalState, tabId, }: {
    internalState: InternalStateStore;
    tabId: string;
}) => CascadedDocumentsStateManager;

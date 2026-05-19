import type { Start as InspectorPublicPluginStart } from '@kbn/inspector-plugin/public';
import type { DiscoverDataStateContainer } from '../state_management/discover_data_state_container';
import type { CascadedDocumentsFetcher } from '../data_fetching/cascaded_documents_fetcher';
import { AggregateRequestAdapter } from '../utils/aggregate_request_adapter';
/**
 * Builds an AggregateRequestAdapter from the data state container's inspector adapters
 * and the cascaded documents fetcher. Shared between useInspector and the tab menu inspector.
 */
export declare const getInspectorRequestAdapters: (dataStateContainer: DiscoverDataStateContainer, cascadedDocumentsFetcher: CascadedDocumentsFetcher) => AggregateRequestAdapter;
export declare function useInspector({ inspector }: {
    inspector: InspectorPublicPluginStart;
}): (onClose?: () => void) => void;

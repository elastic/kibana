import type { DataView } from '@kbn/data-views-plugin/common';
import type { ISearchSource } from '@kbn/data-plugin/common';
import type { DiscoverAppState } from '../redux';
import type { DiscoverServices } from '../../../../build_services';
import type { TabStateGlobalState } from '../redux';
/**
 * Creates a search source based on the provided data view and application state
 */
export declare function createSearchSource({ dataView, appState, globalState, services, }: {
    dataView: DataView | undefined;
    appState: DiscoverAppState | undefined;
    globalState: TabStateGlobalState | undefined;
    services: DiscoverServices;
}): ISearchSource;

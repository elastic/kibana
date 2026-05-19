import type { DataView } from '@kbn/data-views-plugin/public';
import type { DiscoverServices } from '../../../../build_services';
export declare const updateFiltersReferences: ({ prevDataView, nextDataView, services: { uiActions }, }: {
    prevDataView: DataView;
    nextDataView: DataView;
    services: DiscoverServices;
}) => Promise<void>;

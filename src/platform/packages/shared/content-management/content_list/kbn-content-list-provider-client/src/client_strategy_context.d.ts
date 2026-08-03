import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { ContentListFilterMap } from './filters';
export interface ClientStrategyContextValue {
    getItemsSnapshot: () => UserContentCommonSchema[];
    subscribe: (listener: () => void) => () => void;
    filters: ContentListFilterMap;
}
export declare const ClientStrategyContext: import("react").Context<ClientStrategyContextValue | undefined>;
export declare const useClientStrategyContext: (consumerName: string) => ClientStrategyContextValue;

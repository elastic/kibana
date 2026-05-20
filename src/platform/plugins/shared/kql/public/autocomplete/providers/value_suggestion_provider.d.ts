import type { CoreSetup } from '@kbn/core/public';
import type { ValueSuggestionsMethod } from '@kbn/data-plugin/common';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { TimefilterSetup } from '@kbn/data-plugin/public';
import type { AutocompleteUsageCollector } from '../collectors';
export type ValueSuggestionsGetFn = (args: ValueSuggestionsGetFnArgs) => Promise<any[]>;
interface ValueSuggestionsGetFnArgs {
    indexPattern: DataView;
    field: DataViewField;
    query: string;
    useTimeRange?: boolean;
    boolFilter?: any[];
    signal?: AbortSignal;
    method?: ValueSuggestionsMethod;
    querySuggestionKey?: 'rules' | 'cases' | 'alerts' | 'endpoints' | 'action_policies';
}
export declare const getEmptyValueSuggestions: ValueSuggestionsGetFn;
export declare const setupValueSuggestionProvider: (core: CoreSetup, { timefilter, usageCollector, }: {
    timefilter: TimefilterSetup;
    usageCollector?: AutocompleteUsageCollector;
}) => ValueSuggestionsGetFn;
export {};

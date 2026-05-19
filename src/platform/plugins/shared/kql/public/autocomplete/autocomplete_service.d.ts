import type { CoreSetup, PluginInitializerContext } from '@kbn/core/public';
import type { TimefilterSetup } from '@kbn/data-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { QuerySuggestionGetFn } from './providers/query_suggestion_provider';
import type { ValueSuggestionsGetFn } from './providers/value_suggestion_provider';
import type { ConfigSchema } from '../../server/config';
import type { KqlPluginStart, KqlPluginSetupDependencies } from '../plugin';
export declare class AutocompleteService {
    private initializerContext;
    autocompleteConfig: ConfigSchema['autocomplete'];
    constructor(initializerContext: PluginInitializerContext<ConfigSchema>);
    private readonly querySuggestionProviders;
    private getValueSuggestions?;
    private getQuerySuggestions;
    private hasQuerySuggestions;
    /** @public **/
    setup(core: CoreSetup<KqlPluginSetupDependencies, KqlPluginStart>, { timefilter, usageCollection, }: {
        timefilter: TimefilterSetup;
        usageCollection?: UsageCollectionSetup;
    }): {
        /**
         * @deprecated
         * please use "getQuerySuggestions" from the start contract
         */
        getQuerySuggestions: QuerySuggestionGetFn;
        getAutocompleteSettings: () => {
            terminateAfter: number;
            timeout: number;
        };
    };
    /** @public **/
    start(): {
        getQuerySuggestions: QuerySuggestionGetFn;
        hasQuerySuggestions: (language: string) => boolean;
        getValueSuggestions: ValueSuggestionsGetFn;
    };
    /** @internal **/
    clearProviders(): void;
}
/** @public **/
export type AutocompleteSetup = ReturnType<AutocompleteService['setup']>;
/** @public **/
export type AutocompleteStart = ReturnType<AutocompleteService['start']>;

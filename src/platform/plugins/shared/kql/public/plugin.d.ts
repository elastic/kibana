import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { DataPublicPluginStart, DataPublicPluginSetup } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { QueryStringInputProps } from './components/query_string_input/query_string_input';
import { type AutocompleteStart, type AutocompleteSetup } from './autocomplete/autocomplete_service';
export interface KqlPluginSetupDependencies {
    data: DataPublicPluginSetup;
    usageCollection?: UsageCollectionSetup;
}
export interface KqlPluginStartDependencies {
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
}
export interface KqlPluginSetup {
    autocomplete: AutocompleteSetup;
}
export interface KqlPluginStart {
    /**
     * autocomplete service
     * {@link AutocompleteStart}
     */
    autocomplete: AutocompleteStart;
    QueryStringInput: React.ComponentType<Omit<QueryStringInputProps, 'deps'>>;
}
export declare class KqlPlugin implements Plugin<{}, KqlPluginStart> {
    private readonly autocomplete;
    private readonly storage;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup<KqlPluginSetupDependencies, KqlPluginStart>, { data, usageCollection }: KqlPluginSetupDependencies): KqlPluginSetup;
    start(core: CoreStart, { data, dataViews }: KqlPluginStartDependencies): KqlPluginStart;
    stop(): void;
}

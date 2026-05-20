import type { HttpSetup } from '@kbn/core/public';
import type { Field } from '../lib/autocomplete_entities/types';
import type { Alias, DataStream, Mapping, LegacyTemplate, IndexTemplate, ComponentTemplate } from '../lib/autocomplete_entities';
import type { AutocompleteTermDefinition } from '../lib/autocomplete/components/autocomplete_component';
import type { DevToolsSettings, Settings } from './settings';
export declare enum ENTITIES {
    INDICES = "indices",
    FIELDS = "fields",
    INDEX_TEMPLATES = "indexTemplates",
    COMPONENT_TEMPLATES = "componentTemplates",
    LEGACY_TEMPLATES = "legacyTemplates",
    DATA_STREAMS = "dataStreams"
}
interface EntityProviderContext {
    indices: string[];
    types: string[];
}
type EntityListProvider = () => AutocompleteTermDefinition[];
export declare class AutocompleteInfo {
    readonly alias: Alias;
    readonly mapping: Mapping;
    readonly dataStream: DataStream;
    readonly legacyTemplate: LegacyTemplate;
    readonly indexTemplate: IndexTemplate;
    readonly componentTemplate: ComponentTemplate;
    private http;
    private pollTimeoutId;
    setup(http: HttpSetup): void;
    getEntityProvider(type: ENTITIES.FIELDS, context: EntityProviderContext): Field[];
    getEntityProvider(type: Exclude<ENTITIES, ENTITIES.FIELDS>, context?: EntityProviderContext): EntityListProvider;
    /**
     * Indicates if autocomplete_entities fetching is in progress.
     */
    private readonly _isLoading$;
    readonly isLoading$: import("rxjs").Observable<boolean>;
    retrieve(settings: Settings, settingsToRetrieve: DevToolsSettings['autocomplete']): void;
    clearSubscriptions(): void;
    private load;
    clear(): void;
}
export declare const getAutocompleteInfo: import("@kbn/kibana-utils-plugin/public").Get<AutocompleteInfo>, setAutocompleteInfo: import("@kbn/kibana-utils-plugin/public").Set<AutocompleteInfo>;
export {};

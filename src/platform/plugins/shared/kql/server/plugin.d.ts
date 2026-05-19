import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ConfigSchema } from './config';
import type { AutocompleteSetup } from './autocomplete/autocomplete_service';
export interface KQLServerPluginSetup {
    autocomplete: AutocompleteSetup;
}
export interface KQLServerPluginStart {
}
export interface KQLServerPluginSetupDependencies {
}
export interface KQLServerPluginStartDependencies {
}
export declare class KQLServerPlugin implements Plugin<KQLServerPluginSetup, KQLServerPluginStart, KQLServerPluginSetupDependencies, KQLServerPluginStartDependencies> {
    private readonly autocompleteService;
    constructor(initializerContext: PluginInitializerContext<ConfigSchema>);
    setup(core: CoreSetup<KQLServerPluginStartDependencies, KQLServerPluginStart>, {}: KQLServerPluginSetupDependencies): {
        autocomplete: {
            getAutocompleteSettings: () => {
                terminateAfter: number;
                timeout: number;
            };
            getInitializerContextConfig: () => {
                legacy: {
                    globalConfig$: import("rxjs").Observable<import("@kbn/core/server").SharedGlobalConfig>;
                    get: () => import("@kbn/core/server").SharedGlobalConfig;
                };
                create: <T = Readonly<{} & {
                    autocomplete: Readonly<{} & {
                        querySuggestions: Readonly<{} & {
                            enabled: boolean;
                        }>;
                        valueSuggestions: Readonly<{} & {
                            enabled: boolean;
                            timeout: import("moment").Duration;
                            tiers: string[];
                            terminateAfter: import("moment").Duration;
                        }>;
                    }>;
                }>>() => import("rxjs").Observable<T>;
                get: <T = Readonly<{} & {
                    autocomplete: Readonly<{} & {
                        querySuggestions: Readonly<{} & {
                            enabled: boolean;
                        }>;
                        valueSuggestions: Readonly<{} & {
                            enabled: boolean;
                            timeout: import("moment").Duration;
                            tiers: string[];
                            terminateAfter: import("moment").Duration;
                        }>;
                    }>;
                }>>() => T;
            };
        };
    };
    start(core: CoreStart, {}: KQLServerPluginStartDependencies): {};
    stop(): void;
}
export { KQLServerPlugin as Plugin };

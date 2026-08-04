import moment from 'moment';
import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ConfigSchema } from '../config';
export declare class AutocompleteService implements Plugin<void> {
    private initializerContext;
    private valueSuggestionsEnabled;
    private autocompleteSettings;
    constructor(initializerContext: PluginInitializerContext<ConfigSchema>);
    setup(core: CoreSetup): {
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
                        timeout: moment.Duration;
                        tiers: string[];
                        terminateAfter: moment.Duration;
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
                        timeout: moment.Duration;
                        tiers: string[];
                        terminateAfter: moment.Duration;
                    }>;
                }>;
            }>>() => T;
        };
    };
    start(): void;
}
/** @public **/
export type AutocompleteSetup = ReturnType<AutocompleteService['setup']>;

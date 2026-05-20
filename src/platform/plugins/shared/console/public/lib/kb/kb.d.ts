import type { HttpSetup } from '@kbn/core/public';
import type { Api } from './api';
export declare function getUnmatchedEndpointComponents(): import("../autocomplete/components").AutocompleteComponent[];
export declare function getEndpointDescriptionByEndpoint(endpoint: string): Record<string, unknown> & {
    id: string;
    patterns: string[];
    methods: string[];
    url_params?: {
        [x: string]: string | string[];
    } | undefined;
    data_autocomplete_rules?: unknown;
    template?: string;
    paramsAutocomplete?: import("../autocomplete/url_params").UrlParams;
    bodyAutocompleteRootComponents?: import("../autocomplete/components").AutocompleteComponent[];
};
export declare function getEndpointBodyCompleteComponents(endpoint: string): import("../autocomplete/components").AutocompleteComponent[] | undefined;
export declare function getTopLevelUrlCompleteComponents(method: string): import("../autocomplete/components").AutocompleteComponent[];
export declare function getGlobalAutocompleteComponents(term: string, throwOnMissing?: boolean): import("../autocomplete/components").AutocompleteComponent[] | undefined;
declare function loadApisFromJson(json: unknown, urlParametrizedComponentFactories?: ConstructorParameters<typeof Api>[0] & ConstructorParameters<typeof Api>[1], bodyParametrizedComponentFactories?: ConstructorParameters<typeof Api>[0] & ConstructorParameters<typeof Api>[1]): Api | undefined;
declare function setActiveApi(api: Api | undefined): void;
export declare function loadActiveApi(http: HttpSetup): Promise<void>;
export declare const _test: {
    loadApisFromJson: typeof loadApisFromJson;
    setActiveApi: typeof setActiveApi;
};
export {};

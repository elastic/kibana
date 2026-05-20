import type { UrlPatternMatcher } from '../autocomplete/components';
import type { UrlParams } from '../autocomplete/url_params';
import type { compileBodyDescription } from '../autocomplete/body_completer';
import type { AutocompleteComponent } from '../autocomplete/components/autocomplete_component';
type UrlFactories = ConstructorParameters<typeof UrlPatternMatcher>[0];
type BodyFactories = Parameters<typeof compileBodyDescription>[2];
type UrlParamsDescription = ConstructorParameters<typeof UrlParams>[0];
type EndpointDescription = Record<string, unknown> & {
    id: string;
    patterns: string[];
    methods: string[];
    url_params?: UrlParamsDescription;
    data_autocomplete_rules?: unknown;
    template?: string;
    paramsAutocomplete?: UrlParams;
    bodyAutocompleteRootComponents?: AutocompleteComponent[];
};
/**
 * Standalone API container for Console autocomplete.
 *
 * This intentionally preserves the behavior of the previous JS constructor/prototype pattern.
 */
export declare class Api {
    name: string;
    private globalRules;
    private endpoints;
    private urlPatternMatcher;
    private globalBodyComponentFactories;
    constructor(urlParametrizedComponentFactories?: UrlFactories, bodyParametrizedComponentFactories?: BodyFactories);
    addGlobalAutocompleteRules(parentNode: string, rules: unknown): void;
    getGlobalAutocompleteComponents(term: string, throwOnMissing?: boolean): AutocompleteComponent[] | undefined;
    addEndpointDescription(endpoint: string, description: unknown): void;
    getEndpointDescriptionByEndpoint(endpoint: string): EndpointDescription;
    getTopLevelUrlCompleteComponents(method: string): AutocompleteComponent[];
    getUnmatchedEndpointComponents(): AutocompleteComponent[];
    clear(): void;
}
export {};

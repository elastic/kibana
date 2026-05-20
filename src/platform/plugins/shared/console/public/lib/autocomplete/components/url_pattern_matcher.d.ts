import type { SharedComponent } from '.';
import type { AutocompleteComponent } from './autocomplete_component';
/**
 * @param parametrizedComponentFactories a dict of the following structure
 * that will be used as a fall back for pattern parameters (i.e.: {index})
 * {
 *   indices: function (part, parent) {
 *      return new SharedComponent(part, parent)
 *   }
 * }
 * @constructor
 */
export declare class UrlPatternMatcher {
    private readonly byMethod;
    constructor(parametrizedComponentFactories?: ParametrizedComponentFactories);
    addEndpoint(pattern: string, endpoint: EndpointLike): void;
    getTopLevelComponents(method?: string | null): AutocompleteComponent[];
}
interface ParametrizedComponentFactories {
    getComponent: (part: string) => ((part: string, parent: SharedComponent) => SharedComponent) | undefined;
}
interface EndpointLike {
    id: string;
    methods: string[];
    template?: string;
    url_components?: Record<string, unknown>;
    [key: string]: unknown;
}
export {};

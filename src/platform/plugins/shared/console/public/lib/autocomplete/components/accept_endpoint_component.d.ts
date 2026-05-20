import { SharedComponent } from './shared_component';
import type { AutocompleteMatch } from './autocomplete_component';
import type { AutoCompleteContext } from '../types';
export declare const URL_PATH_END_MARKER = "__url_path_end__";
interface EndpointLike {
    id: string;
    methods?: string[];
    priority?: number;
}
export declare class AcceptEndpointComponent extends SharedComponent {
    endpoint: EndpointLike;
    constructor(endpoint: EndpointLike, parent?: SharedComponent);
    match(token: string | string[], context: AutoCompleteContext, editor: unknown): AutocompleteMatch;
}
export {};

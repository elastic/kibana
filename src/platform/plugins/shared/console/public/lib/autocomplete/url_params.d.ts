import { ConstantComponent, SharedComponent } from './components';
import type { AutocompleteComponent } from './components/autocomplete_component';
import type { ResultTerm } from './types';
export declare class ParamComponent extends ConstantComponent {
    private readonly description;
    constructor(name: string, parent: SharedComponent, description: UrlParamValue);
    getTerms(): ResultTerm[];
}
type UrlParamValue = '__flag__' | string[] | string;
type UrlParamsDescription = Record<string, UrlParamValue>;
export declare class UrlParams {
    private readonly rootComponent;
    constructor(description?: UrlParamsDescription, defaults?: UrlParamsDescription);
    getTopLevelComponents(): AutocompleteComponent[];
}
export {};

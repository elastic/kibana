import { SharedComponent } from './shared_component';
/** A component that suggests one of the give options, but accepts anything */
import type { AutocompleteMatch, AutocompleteTermDefinition } from './autocomplete_component';
import type { AutoCompleteContext } from '../types';
type ListGenerator = (context?: AutoCompleteContext, editor?: unknown) => AutocompleteTermDefinition[];
export declare class ListComponent extends SharedComponent {
    listGenerator: ListGenerator;
    multiValued: boolean;
    allowNonValidValues: boolean;
    constructor(name: string, list: AutocompleteTermDefinition[] | ListGenerator, parent?: SharedComponent, multiValued?: boolean, allowNonValidValues?: boolean);
    getTerms(context: AutoCompleteContext, editor: unknown): AutocompleteTermDefinition[];
    validateTokens(tokens: string[]): boolean;
    getContextKey(): string;
    getDefaultTermMeta(): string;
    match(token: string | string[], context: AutoCompleteContext, editor: unknown): AutocompleteMatch;
}
export {};

import { SharedComponent } from '.';
import type { AutocompleteComponent, AutocompleteMatch, AutocompleteTermDefinition } from './autocomplete_component';
import type { AutoCompleteContext } from '../types';
/**
 * @param constants list of components that represent constant keys
 * @param patternsAndWildCards list of components that represent patterns and should be matched only if
 * there is no constant matches
 */
type ObjectComponentContext = AutoCompleteContext & {
    globalComponentResolver: (token: unknown, nested: boolean) => AutocompleteComponent[] | undefined | null;
};
export declare class ObjectComponent extends SharedComponent {
    constants: AutocompleteComponent[];
    patternsAndWildCards: AutocompleteComponent[];
    constructor(name: string, constants: AutocompleteComponent[], patternsAndWildCards: AutocompleteComponent[]);
    getTerms(context: ObjectComponentContext, editor: unknown): AutocompleteTermDefinition[];
    match(token: unknown, context: ObjectComponentContext, editor: unknown): AutocompleteMatch;
}
export {};

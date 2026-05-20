import { SharedComponent } from './shared_component';
import type { AutocompleteComponent, AutocompleteMatch, AutocompleteTermDefinition } from './autocomplete_component';
import type { AutoCompleteContext } from '../types';
export declare class ConditionalProxy extends SharedComponent {
    predicate: (context: AutoCompleteContext, editor: unknown) => boolean;
    delegate: AutocompleteComponent;
    constructor(predicate: (context: AutoCompleteContext, editor: unknown) => boolean, delegate: AutocompleteComponent);
    getTerms(context: AutoCompleteContext, editor: unknown): AutocompleteTermDefinition[] | null;
    match(token: unknown, context: AutoCompleteContext, editor: unknown): AutocompleteMatch;
}

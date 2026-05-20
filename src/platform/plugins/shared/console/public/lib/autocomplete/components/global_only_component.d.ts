import { SharedComponent } from './shared_component';
import type { AutocompleteComponent, AutocompleteMatch, AutocompleteTermDefinition } from './autocomplete_component';
import type { AutoCompleteContext } from '../types';
type GlobalOnlyContext = AutoCompleteContext & {
    globalComponentResolver: (token: unknown, nested: boolean) => AutocompleteComponent[] | undefined | null;
};
export declare class GlobalOnlyComponent extends SharedComponent {
    getTerms(): AutocompleteTermDefinition[] | null;
    match(token: unknown, context: GlobalOnlyContext): AutocompleteMatch;
}
export {};

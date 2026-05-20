import { SharedComponent } from './shared_component';
import type { AutocompleteMatch, AutocompleteTermDefinition } from './autocomplete_component';
import type { AutoCompleteContext } from '../types';
export declare class ConstantComponent extends SharedComponent {
    options: AutocompleteTermDefinition[];
    constructor(name: string, parent?: SharedComponent, options?: AutocompleteTermDefinition | AutocompleteTermDefinition[]);
    getTerms(): AutocompleteTermDefinition[];
    addOption(options: AutocompleteTermDefinition | AutocompleteTermDefinition[]): void;
    match(token: unknown, context: AutoCompleteContext, editor: unknown): AutocompleteMatch;
}

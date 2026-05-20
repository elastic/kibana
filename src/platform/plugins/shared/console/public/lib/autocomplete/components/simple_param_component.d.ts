import { SharedComponent } from './shared_component';
import type { AutocompleteMatch } from './autocomplete_component';
import type { AutoCompleteContext } from '../types';
export declare class SimpleParamComponent extends SharedComponent {
    constructor(name: string, parent?: SharedComponent);
    match(token: unknown, context: AutoCompleteContext, editor: unknown): AutocompleteMatch;
}

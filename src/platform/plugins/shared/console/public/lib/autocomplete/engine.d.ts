import type { AutocompleteComponent } from './components/autocomplete_component';
import type { AutoCompleteContext } from './types';
declare global {
    interface Window {
        engine_trace?: boolean;
    }
}
type AutocompleteContext = AutoCompleteContext;
export declare function wrapComponentWithDefaults<T extends AutocompleteComponent>(component: T, defaults: Record<string, unknown>): T;
export declare class WalkingState {
    name?: string;
    parentName: string | undefined;
    components: AutocompleteComponent[];
    contextExtensionList: Array<Record<string, unknown>>;
    depth: number;
    priority: number | undefined;
    constructor(parentName: string | undefined, components: AutocompleteComponent[], contextExtensionList: Array<Record<string, unknown>>, depth?: number, priority?: number);
}
export declare function walkTokenPath(tokenPath: Array<string | string[]>, walkingStates: WalkingState[], context: AutocompleteContext, editor: unknown): WalkingState[];
export declare function populateContext(tokenPath: Array<string | string[]>, context: AutocompleteContext, editor: unknown, includeAutoComplete: boolean, components: AutocompleteComponent[]): void;
export {};

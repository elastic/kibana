import { ListComponent } from './list_component';
import type { SharedComponent } from './shared_component';
export declare class FieldAutocompleteComponent extends ListComponent {
    constructor(name: string, parent?: SharedComponent, multiValued?: boolean);
    validateTokens(tokens: string[]): boolean;
    getDefaultTermMeta(): string;
    getContextKey(): string;
}

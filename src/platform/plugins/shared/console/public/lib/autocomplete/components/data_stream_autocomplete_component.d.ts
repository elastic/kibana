import { ListComponent } from './list_component';
import type { SharedComponent } from './shared_component';
export declare class DataStreamAutocompleteComponent extends ListComponent {
    constructor(name: string, parent?: SharedComponent, multiValued?: boolean);
    getContextKey(): string;
}

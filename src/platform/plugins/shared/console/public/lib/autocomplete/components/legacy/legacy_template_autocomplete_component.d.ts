import { ListComponent } from '../list_component';
import type { SharedComponent } from '../shared_component';
export declare class LegacyTemplateAutocompleteComponent extends ListComponent {
    constructor(name: string, parent?: SharedComponent);
    getContextKey(): string;
}

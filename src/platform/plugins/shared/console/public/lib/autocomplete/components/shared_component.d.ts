import { AutocompleteComponent } from './autocomplete_component';
export declare class SharedComponent extends AutocompleteComponent {
    _nextDict: Record<string, SharedComponent[]>;
    _parent?: SharedComponent;
    constructor(name: string, parent?: SharedComponent);
    getComponent(name: string): SharedComponent | undefined;
    addComponent(component: SharedComponent): void;
}

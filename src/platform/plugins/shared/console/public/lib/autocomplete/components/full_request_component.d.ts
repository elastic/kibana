import { ConstantComponent } from './constant_component';
import type { SharedComponent } from './shared_component';
export declare class FullRequestComponent extends ConstantComponent {
    private readonly template;
    readonly name: string;
    constructor(name: string, parent: SharedComponent | undefined, template: string);
    getTerms(): {
        name: string;
        snippet: string;
    }[];
}

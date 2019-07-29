import { Type } from './type';
export declare class NeverType extends Type<never> {
    constructor();
    protected handleError(type: string): "a value wasn't expected to be present" | undefined;
}
//# sourceMappingURL=never_type.d.ts.map
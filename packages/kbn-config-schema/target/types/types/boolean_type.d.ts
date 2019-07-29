import { Type, TypeOptions } from './type';
export declare class BooleanType extends Type<boolean> {
    constructor(options?: TypeOptions<boolean>);
    protected handleError(type: string, { value }: Record<string, any>): string | undefined;
}
//# sourceMappingURL=boolean_type.d.ts.map
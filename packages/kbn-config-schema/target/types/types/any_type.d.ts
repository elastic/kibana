import { Type, TypeOptions } from './type';
export declare class AnyType extends Type<any> {
    constructor(options?: TypeOptions<any>);
    protected handleError(type: string, { value }: Record<string, any>): string | undefined;
}
//# sourceMappingURL=any_type.d.ts.map
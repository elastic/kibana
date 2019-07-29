import { SchemaTypesError } from '../errors';
import { Type, TypeOptions } from './type';
export declare class UnionType<RTS extends Array<Type<any>>, T> extends Type<T> {
    constructor(types: RTS, options?: TypeOptions<T>);
    protected handleError(type: string, { reason, value }: Record<string, any>, path: string[]): string | SchemaTypesError | undefined;
}
//# sourceMappingURL=union_type.d.ts.map
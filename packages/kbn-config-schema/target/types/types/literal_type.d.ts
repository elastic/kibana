import { Type } from './type';
export declare class LiteralType<T> extends Type<T> {
    constructor(value: T);
    protected handleError(type: string, { value, valids: [expectedValue] }: Record<string, any>): string | undefined;
}
//# sourceMappingURL=literal_type.d.ts.map
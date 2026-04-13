import { Type } from './type';
export declare class LiteralType<T> extends Type<T> {
    private expectedValue;
    constructor(value: T);
    protected handleError(type: string): string | undefined;
}

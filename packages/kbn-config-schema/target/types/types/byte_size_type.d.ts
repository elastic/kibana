import { ByteSizeValue } from '../byte_size_value';
import { SchemaTypeError } from '../errors';
import { Type } from './type';
export interface ByteSizeOptions {
    validate?: (value: ByteSizeValue) => string | void;
    defaultValue?: ByteSizeValue | string | number;
    min?: ByteSizeValue | string | number;
    max?: ByteSizeValue | string | number;
}
export declare class ByteSizeType extends Type<ByteSizeValue> {
    constructor(options?: ByteSizeOptions);
    protected handleError(type: string, { limit, message, value }: Record<string, any>, path: string[]): string | SchemaTypeError | undefined;
}
//# sourceMappingURL=byte_size_type.d.ts.map
import { Duration } from '../duration';
import { SchemaTypeError } from '../errors';
import { Reference } from '../references';
import { Type } from './type';
declare type DurationValueType = Duration | string | number;
export interface DurationOptions {
    defaultValue?: DurationValueType | Reference<DurationValueType> | (() => DurationValueType);
    validate?: (value: Duration) => string | void;
}
export declare class DurationType extends Type<Duration> {
    constructor(options?: DurationOptions);
    protected handleError(type: string, { message, value }: Record<string, any>, path: string[]): string | SchemaTypeError | undefined;
}
export {};
//# sourceMappingURL=duration_type.d.ts.map
import type { Duration } from '../duration';
import type { SchemaTypeError } from '../errors';
import type { Reference } from '../references';
import { Type } from './type';
export type DurationValueType = Duration | string | number;
export interface DurationOptions {
    defaultValue?: DurationValueType | Reference<DurationValueType> | (() => DurationValueType);
    validate?: (value: Duration) => string | void;
    min?: DurationValueType;
    max?: DurationValueType;
}
export declare class DurationType extends Type<Duration> {
    constructor(options?: DurationOptions);
    protected handleError(type: string, { message, value, limit }: Record<string, any>, path: string[]): string | SchemaTypeError | undefined;
}

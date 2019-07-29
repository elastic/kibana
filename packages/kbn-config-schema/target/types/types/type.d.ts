import { SchemaTypeError } from '../errors';
import { AnySchema } from '../internals';
import { Reference } from '../references';
export interface TypeOptions<T> {
    defaultValue?: T | Reference<T> | (() => T);
    validate?: (value: T) => string | void;
}
export declare abstract class Type<V> {
    readonly type: V;
    /**
     * Internal "schema" backed by Joi.
     * @type {Schema}
     */
    protected readonly internalSchema: AnySchema;
    protected constructor(schema: AnySchema, options?: TypeOptions<V>);
    validate(value: any, context?: Record<string, any>, namespace?: string): V;
    protected handleError(type: string, context: Record<string, any>, path: string[]): string | SchemaTypeError | void;
    private onError;
}
//# sourceMappingURL=type.d.ts.map
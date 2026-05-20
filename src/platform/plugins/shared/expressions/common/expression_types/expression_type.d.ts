import type { Serializable } from '@kbn/utility-types';
import type { AnyExpressionTypeDefinition, ExpressionValue, ExpressionValueConverter } from './types';
export declare class ExpressionType {
    name: string;
    namespace?: string;
    /**
     * A short help text.
     */
    help: string;
    /**
     * Type validation, useful for checking function output.
     */
    validate: (type: unknown) => void | Error;
    create: unknown;
    /**
     * Optional serialization (used when passing context around client/server).
     */
    serialize?: (value: Serializable) => unknown;
    deserialize?: (serialized: unknown[]) => Serializable;
    private readonly definition;
    constructor(definition: AnyExpressionTypeDefinition);
    getToFn: (typeName: string) => undefined | ExpressionValueConverter<ExpressionValue, ExpressionValue>;
    getFromFn: (typeName: string) => undefined | ExpressionValueConverter<ExpressionValue, ExpressionValue>;
    castsTo: (value: ExpressionValue) => boolean;
    castsFrom: (value: ExpressionValue) => boolean;
    to: (value: ExpressionValue, toTypeName: string, types: Record<string, ExpressionType>) => any;
    from: (value: ExpressionValue, types: Record<string, ExpressionType>) => any;
}

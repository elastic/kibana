import type { ExpressionType } from './expression_type';
import type { ExpressionValue } from './types';
export declare const serializeProvider: (types: Record<string, ExpressionType>) => {
    serialize: (value: ExpressionValue) => unknown;
    deserialize: (value: ExpressionValue) => any;
};

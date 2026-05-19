import type { ExpressionValueError } from '..';
export type SerializedError = {
    name: string;
    message: string;
    stack?: string;
};
export type ErrorLike = SerializedError & {
    original?: SerializedError;
};
export declare const createError: (err: string | ErrorLike) => ExpressionValueError;

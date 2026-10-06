import type { SerializableRecord } from '@kbn/utility-types';
import type { ExpressionTypeDefinition, ExpressionValueBoxed } from '../types';
import type { ErrorLike } from '../../util';
export type ExpressionValueError = ExpressionValueBoxed<'error', {
    error: ErrorLike;
    info?: SerializableRecord;
}>;
export declare const isExpressionValueError: (value: unknown) => value is ExpressionValueError;
/**
 * @deprecated
 *
 * Exported for backwards compatibility.
 */
export type InterpreterErrorType = ExpressionValueError;
export declare const error: ExpressionTypeDefinition<'error', ExpressionValueError>;

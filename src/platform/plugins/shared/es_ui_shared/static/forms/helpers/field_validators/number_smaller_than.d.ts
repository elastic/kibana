import type { ValidationFunc, ValidationError } from '../../hook_form_lib';
import type { ERROR_CODE } from './types';
export declare const numberSmallerThanField: ({ than, message, allowEquality, }: {
    than: number;
    message: string | ((err: Partial<ValidationError>) => string);
    allowEquality?: boolean;
}) => (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc<any, ERROR_CODE>>;

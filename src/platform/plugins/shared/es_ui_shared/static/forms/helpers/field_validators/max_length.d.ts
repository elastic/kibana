import type { ValidationFunc, ValidationError } from '../../hook_form_lib';
import type { ERROR_CODE } from './types';
export declare const maxLengthField: ({ length, message, }: {
    length: number;
    message: string | ((err: Partial<ValidationError>) => string);
}) => (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc<any, ERROR_CODE>>;

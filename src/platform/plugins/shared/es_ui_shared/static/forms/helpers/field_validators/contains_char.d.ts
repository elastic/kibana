import type { ValidationFunc, ValidationError } from '../../hook_form_lib';
import type { ERROR_CODE } from './types';
export declare const containsCharsField: ({ message, chars, }: {
    message: string | ((err: Partial<ValidationError>) => string);
    chars: string | string[];
}) => (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc<any, ERROR_CODE>>;

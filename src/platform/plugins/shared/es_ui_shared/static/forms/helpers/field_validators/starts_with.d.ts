import type { ValidationFunc } from '../../hook_form_lib';
import type { ERROR_CODE } from './types';
export declare const startsWithField: ({ message, char }: {
    message: string;
    char: string;
}) => (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc<any, ERROR_CODE>>;

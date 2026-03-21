import type { ValidationFunc } from '../../hook_form_lib';
import type { ERROR_CODE } from './types';
export declare const urlField: (message: string, { requireTld }?: {
    requireTld?: boolean;
}) => (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc<any, ERROR_CODE>>;

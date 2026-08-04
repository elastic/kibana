import type { ValidationFunc } from '../../hook_form_lib';
import type { ERROR_CODE } from './types';
export declare const indexPatternField: (i18n: any) => (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc<any, ERROR_CODE>>;

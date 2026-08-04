import type { ValidationFunc, ValidationError } from '../../hook_form_lib';
import type { ERROR_CODE } from './types';
/**
 * Validator to validate that a EuiSelectable has a minimum number
 * of items selected.
 * @param total Minimum number of items
 */
export declare const minSelectableSelectionField: ({ total, message, }: {
    total: number;
    message: string | ((err: Partial<ValidationError>) => string);
}) => (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc<any, ERROR_CODE>>;

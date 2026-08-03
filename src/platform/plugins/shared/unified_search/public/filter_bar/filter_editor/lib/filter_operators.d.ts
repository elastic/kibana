import { FILTERS } from '@kbn/es-query';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { FilterMetaParams } from '@kbn/es-query/src/filters/build_filters';
export declare const strings: {
    getIsOperatorOptionLabel: () => string;
    getIsNotOperatorOptionLabel: () => string;
    getIsOneOfOperatorOptionLabel: () => string;
    getIsNotOneOfOperatorOptionLabel: () => string;
    getIsBetweenOperatorOptionLabel: () => string;
    getIsGreaterOrEqualOperatorOptionLabel: () => string;
    getLessThanOperatorOptionLabel: () => string;
    getIsNotBetweenOperatorOptionLabel: () => string;
    getExistsOperatorOptionLabel: () => string;
    getDoesNotExistOperatorOptionLabel: () => string;
};
export declare enum OPERATORS {
    LESS = "less",
    GREATER_OR_EQUAL = "greater_or_equal",
    BETWEEN = "between",
    IS = "is",
    NOT_BETWEEN = "not_between",
    IS_NOT = "is_not",
    IS_ONE_OF = "is_one_of",
    IS_NOT_ONE_OF = "is_not_one_of",
    EXISTS = "exists",
    DOES_NOT_EXIST = "does_not_exist"
}
export interface Operator {
    message: string;
    type: FILTERS;
    negate: boolean;
    id: OPERATORS;
    /**
     * KbnFieldTypes applicable for operator
     */
    fieldTypes?: string[];
    /**
     * A filter predicate for a field,
     * takes precedence over {@link fieldTypes}
     */
    field?: (field: DataViewField) => boolean;
    /**
     * If applicable, preserves or converts filter params when switching between operators
     */
    getParamsFromPrevOperator?: (prevOperator: Operator | undefined, params: FilterMetaParams) => FilterMetaParams | undefined;
}
export declare const isOperator: Operator;
export declare const isNotOperator: Operator;
export declare const isOneOfOperator: Operator;
export declare const isNotOneOfOperator: Operator;
export declare const isBetweenOperator: Operator;
export declare const isNotBetweenOperator: Operator;
export declare const isLessThanOperator: Operator;
export declare const isGreaterOrEqualOperator: Operator;
export declare const existsOperator: Operator;
export declare const doesNotExistOperator: Operator;
export declare const FILTER_OPERATORS: Operator[];

/**
 * As Code Filter operator constants
 * These operators are used in SimpleFilterCondition to specify how to match field values
 */
export declare const ASCODE_FILTER_OPERATOR: {
    readonly IS: "is";
    readonly IS_ONE_OF: "is_one_of";
    readonly EXISTS: "exists";
    readonly RANGE: "range";
};
export declare const ASCODE_GROUPED_CONDITION_TYPE: {
    readonly AND: "and";
    readonly OR: "or";
};
export declare const ASCODE_FILTER_TYPE: {
    readonly CONDITION: "condition";
    readonly GROUP: "group";
    readonly DSL: "dsl";
    readonly SPATIAL: "spatial";
};

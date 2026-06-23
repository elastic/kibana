import { type EsqlFieldType } from '@kbn/esql-types';
import type { LicenseType } from '@kbn/licensing-types';
import type { PricingProduct } from '@kbn/core-pricing-common/src/types';
import type { ESQLLocation, ESQLNumericLiteralType } from '@elastic/esql/types';
import type { Location } from '../registry/types';
import type { inlineCastsMapping } from './generated/inline_casts_mapping';
/**
 * This is the list of all data types that are supported in ES|QL.
 *
 * Not all of these can be used as field types. Some can only be literals,
 * others may be the value of a field, but cannot be used in the index mapping.
 *
 * This is a partial list. The full list is here and we may need to expand this type as
 * the capabilities of the client-side engines grow.
 * https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/esql-core/src/main/java/org/elasticsearch/xpack/esql/core/type/DataType.java
 */
export declare const dataTypes: readonly string[];
export type SupportedDataType = (typeof dataTypes)[number];
/**
 * This is a set of array types. These aren't official ES|QL types, but they are
 * currently used in the function definitions in a couple of specific scenarios.
 *
 * The fate of these is uncertain. They may be removed in the future.
 */
declare const arrayTypes: readonly string[];
export type ArrayType = (typeof arrayTypes)[number];
export declare function isArrayType(type: string): type is ArrayType;
export declare enum FunctionDefinitionTypes {
    AGG = "agg",
    SCALAR = "scalar",
    OPERATOR = "operator",
    GROUPING = "grouping",
    TIME_SERIES_AGG = "time_series_agg"
}
export declare const grokSupportedDataTypes: readonly ["int", "long", "double", "float", "boolean"];
export type GrokDataType = (typeof grokSupportedDataTypes)[number];
export type ReasonTypes = 'missingCommand' | 'unsupportedFunction' | 'unknownFunction';
/**
 * This is the type of a parameter in a function definition.
 */
export type FunctionParameterType = Exclude<SupportedDataType, 'unsupported'> | ArrayType | 'any';
export declare const isFieldType: (str: string | undefined) => str is EsqlFieldType;
export declare const isParameterType: (str: string | undefined) => str is FunctionParameterType;
export declare const isReturnType: (str: string | FunctionParameterType) => str is FunctionReturnType;
export declare const parameterHintEntityTypes: readonly ["inference_endpoint"];
export type ParameterHintEntityType = (typeof parameterHintEntityTypes)[number];
export declare const parameterHintKinds: readonly ["entity", "aggregation"];
export type ParameterHintKind = (typeof parameterHintKinds)[number];
export interface ParameterHint {
    entityType?: ParameterHintEntityType;
    constraints?: Record<string, string>;
    kind?: ParameterHintKind;
}
export interface FunctionParameter {
    name: string;
    type: FunctionParameterType;
    description?: string;
    optional?: boolean;
    supportsWildcard?: boolean;
    /**
     * If set, this parameter does not accept a field. It only accepts a constant,
     * though a function can be used to create the value. (e.g. now() for dates or concat() for strings)
     */
    constantOnly?: boolean;
    /**
     * Default to false. If set to true, this parameter does not accept a function or literal, only fields.
     */
    fieldsOnly?: boolean;
    /**
     * A list of suggested values for this parameter.
     */
    suggestedValues?: string[];
    mapParams?: string;
    /** If true, this parameter supports multiple values (arrays). Default is false.
     * This indicates that the parameter can accept multiple values, which will be passed as an array.
     */
    supportsMultiValues?: boolean;
    /**
     * Provides information that is useful for getting parameter values from external sources.
     * For example, an inference endpoint
     */
    hint?: ParameterHint;
}
export interface ElasticsearchCommandDefinition {
    type: string;
    name: string;
    license?: LicenseType;
    observability_tier?: string;
}
export interface ElasticsearchSettingsDefinition {
    name: string;
    type: string;
    serverlessOnly: boolean;
    preview: boolean;
    snapshotOnly: boolean;
    description: string;
    ignoreAsSuggestion?: boolean;
}
/**
 * This is the return type of a function definition.
 *
 * TODO: remove `any`
 */
export type FunctionReturnType = Exclude<SupportedDataType, 'unsupported'> | 'unknown' | 'any';
export interface Signature {
    params: FunctionParameter[];
    minParams?: number;
    returnType: FunctionReturnType;
    license?: LicenseType;
    isSignatureRepeating?: boolean;
}
export interface FunctionDefinition {
    type: FunctionDefinitionTypes;
    preview?: boolean;
    ignoreAsSuggestion?: boolean;
    tsdbCompatible?: boolean;
    name: string;
    alias?: string[];
    description: string;
    locationsAvailable: Location[];
    signatures: Signature[];
    examples?: string[];
    operator?: string;
    customParametersSnippet?: string;
    license?: LicenseType;
    observabilityTier?: Uppercase<Extract<PricingProduct, {
        type: 'observability';
    }>['tier']>;
}
export interface FunctionFilterPredicates {
    location: Location;
    returnTypes?: string[];
    ignored?: string[];
    allowed?: string[];
    isTimeseriesSource?: boolean;
}
export declare enum PromQLFunctionDefinitionTypes {
    WITHIN_SERIES = "within_series",
    ACROSS_SERIES = "across_series",
    VALUE_TRANSFORMATION = "value_transformation",
    VECTOR_CONVERSION = "vector_conversion",
    SCALAR = "scalar",
    OPERATOR = "operator",
    LABEL_MATCHING_OPERATOR = "label_matching_operator",
    SCALAR_CONVERSION = "scalar_conversion",
    TIME = "time",
    HISTOGRAM = "histogram"
}
export type PromQLFunctionParamType = 'instant_vector' | 'range_vector' | 'scalar' | 'string';
export interface PromQLFunctionParameter {
    name: string;
    type: PromQLFunctionParamType;
    optional: boolean;
    description?: string;
}
export interface PromQLSignature {
    params: PromQLFunctionParameter[];
    returnType: PromQLFunctionParamType;
    minParams?: number;
}
export interface PromQLFunctionDefinition {
    type: PromQLFunctionDefinitionTypes;
    name: string;
    operator?: string;
    description: string;
    preview?: boolean;
    ignoreAsSuggestion?: boolean;
    signatures: PromQLSignature[];
    locationsAvailable: Location[];
    examples?: string[];
}
export interface PromQLESFunctionDefinition {
    type: string;
    name: string;
    operator?: string;
    description: string;
    signatures: Array<{
        params: PromQLFunctionParameter[];
        variadic: boolean;
        returnType: PromQLFunctionParamType;
    }>;
    examples: string[];
    preview: boolean;
    snapshot_only: boolean;
}
export interface Literals {
    name: string;
    description: string;
}
export interface ValidationErrors {
    wrongNumberArgsExact: {
        message: string;
        type: {
            fn: string;
            expected: number;
            actual: number;
        };
    };
    wrongNumberArgsVariadic: {
        message: string;
        type: {
            fn: string;
            validArgCounts: number[];
            actual: number;
        };
    };
    wrongNumberArgsAtLeast: {
        message: string;
        type: {
            fn: string;
            minArgs: number;
            actual: number;
        };
    };
    noMatchingCallSignature: {
        message: string;
        type: {
            functionName: string;
            argTypes: string;
            validSignatures: string[];
        };
    };
    unknownColumn: {
        message: string;
        type: {
            name: string | number;
        };
    };
    unmappedColumnWarning: {
        message: string;
        type: {
            name: string | number;
        };
    };
    unknownFunction: {
        message: string;
        type: {
            name: string;
        };
    };
    unknownIndex: {
        message: string;
        type: {
            name: string;
        };
    };
    unknownDataSource: {
        message: string;
        type: {
            name: string;
        };
    };
    unknownSetting: {
        message: string;
        type: {
            name: string;
        };
    };
    unknownCastingType: {
        message: string;
        type: {
            castType: string;
        };
    };
    invalidInlineCast: {
        message: string;
        type: {
            castType: string;
            valueType: string;
        };
    };
    functionNotAllowedHere: {
        message: string;
        type: {
            name: string;
            locationName: string;
        };
    };
    unsupportedColumnTypeForCommand: {
        message: string;
        type: {
            command: string;
            type: string;
            givenType: string;
            column: string;
        };
    };
    unknownDissectKeyword: {
        message: string;
        type: {
            keyword: string;
        };
    };
    wrongOptionArgumentType: {
        message: string;
        type: {
            command: string;
            option: string;
            type: string;
            givenValue: string;
        };
    };
    unknownInterval: {
        message: string;
        type: {
            value: string;
        };
    };
    unknownPolicy: {
        message: string;
        type: {
            name: string;
        };
    };
    nestedAggFunction: {
        message: string;
        type: {
            parentName: string;
            name: string;
        };
    };
    expectedAggregationArgument: {
        message: string;
        type: {
            parentName: string;
        };
    };
    unknownAggregateFunction: {
        message: string;
        type: {
            type: string;
            value: string;
        };
    };
    unsupportedFieldType: {
        message: string;
        type: {
            field: string;
        };
    };
    columnTypeConflict: {
        message: string;
        type: {
            columnName: string;
            types?: string;
        };
    };
    unsupportedMode: {
        message: string;
        type: {
            command: string;
            value: string;
            expected: string;
        };
    };
    metadataBracketsDeprecation: {
        message: string;
        type: {};
    };
    unknownMetadataField: {
        message: string;
        type: {
            value: string;
            availableFields: string;
        };
    };
    promqlInvalidParam: {
        message: string;
        type: {
            reason: string;
        };
    };
    promqlMutuallyExclusiveParams: {
        message: string;
        type: {
            param1: string;
            param2: string;
        };
    };
    promqlMissingQuery: {
        message: string;
        type: {};
    };
    promqlUnknownFunction: {
        message: string;
        type: {
            fn: string;
        };
    };
    promqlWrongNumberArgs: {
        message: string;
        type: {
            fn: string;
            expected: string;
            actual: number;
        };
    };
    promqlGroupingNotAllowed: {
        message: string;
        type: {
            fn: string;
        };
    };
    promqlNoMatchingSignature: {
        message: string;
        type: {
            fn: string;
            required: string;
        };
    };
    wrongDissectOptionArgumentType: {
        message: string;
        type: {
            value: string | number;
        };
    };
    invalidJoinIndex: {
        message: string;
        type: {
            identifier: string;
        };
    };
    tooManyForks: {
        message: string;
        type: {};
    };
    licenseRequired: {
        message: string;
        type: {
            name: string;
            requiredLicense: string;
        };
    };
    licenseRequiredForSignature: {
        message: string;
        type: {
            name: string;
            signatureDescription: string;
            requiredLicense: string;
        };
    };
    changePointWrongFieldType: {
        message: string;
        type: {
            columnName: string;
            givenType: string;
        };
    };
    dropTimestampWarning: {
        message: string;
        type: {};
    };
    inferenceIdRequired: {
        message: string;
        type: {};
    };
    unsupportedQueryType: {
        message: string;
        type: {};
    };
    forkTooManyBranches: {
        message: string;
        type: {};
    };
    forkNotAllowedWithSubqueries: {
        message: string;
        type: {};
    };
    joinOnSingleExpression: {
        message: string;
        type: {};
    };
    invalidSettingValue: {
        message: string;
        type: {
            value: string;
            setting: string;
        };
    };
    unknownMapParameterName: {
        message: string;
        type: {
            paramName: string;
        };
    };
    invalidMapParameterValueType: {
        message: string;
        type: {
            paramName: string;
            expectedType: string;
            actualType: string;
        };
    };
    mmrQueryVectorWrongType: {
        message: string;
        type: {
            type: string;
        };
    };
    mmrOnFieldWrongType: {
        message: string;
        type: {
            type: string;
        };
    };
    tsdbIncompatibleFunction: {
        message: string;
        type: {
            fnName: string;
        };
    };
}
export type ErrorTypes = keyof ValidationErrors;
export type ErrorValues<K extends ErrorTypes> = ValidationErrors[K]['type'];
export type ESQLDiagnosticData = ColumnTypeConflictDiagnosticData;
interface ColumnTypeConflictDiagnosticData {
    columnName: string;
    types: string[];
}
export interface ESQLMessage {
    type: 'error' | 'warning';
    text: string;
    location: ESQLLocation;
    code: string;
    data?: ESQLDiagnosticData;
    errorType?: 'semantic';
    requiresCallback?: 'getColumnsFor' | 'getSources' | 'getPolicies' | 'getJoinIndices' | string;
    underlinedWarning?: boolean;
}
/**
 * Handles numeric types in ES|QL.
 */
export declare const ESQL_COMMON_NUMERIC_TYPES: readonly ["double", "long", "integer"];
export declare const ESQL_NUMERIC_DECIMAL_TYPES: readonly ["double", "unsigned_long", "long", "counter_long", "counter_double"];
export declare const ESQL_NUMBER_TYPES: readonly SupportedDataType[];
export declare const ESQL_ARITHMETIC_TYPES: readonly string[];
export declare function isNumericType(type: unknown): type is ESQLNumericLiteralType;
export declare function supportsArithmeticOperations(type: string): boolean;
export declare const ESQL_STRING_TYPES: readonly ["keyword", "text"];
export declare const ESQL_NAMED_PARAMS_TYPE: "function_named_parameters";
export type InlineCastingType = keyof typeof inlineCastsMapping;
export {};

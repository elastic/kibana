import type { BehaviorSubject } from 'rxjs';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
type PublishingSubject<T extends unknown = unknown> = Omit<BehaviorSubject<T>, 'next'>;
export declare enum VariableNamePrefix {
    IDENTIFIER = "??",
    VALUE = "?"
}
export declare enum ESQLVariableType {
    TIME_LITERAL = "time_literal",
    FIELDS = "fields",
    VALUES = "values",
    MULTI_VALUES = "multi_values",
    FUNCTIONS = "functions"
}
/**
 * Types of ES|QL controls
 * - STATIC_VALUES: Static values that are not dependent on any query
 * - VALUES_FROM_QUERY: Values that are dependent on an ES|QL query
 */
export declare enum EsqlControlType {
    STATIC_VALUES = "STATIC_VALUES",
    VALUES_FROM_QUERY = "VALUES_FROM_QUERY"
}
export type StaticESQLControl = Extract<OptionsListESQLControlState, {
    control_type: 'STATIC_VALUES';
}>;
export declare const isStaticESQLControl: (control?: object) => control is StaticESQLControl;
export type QueryESQLControl = Extract<OptionsListESQLControlState, {
    control_type: 'VALUES_FROM_QUERY';
}>;
export declare const isQueryESQLControl: (control?: object) => control is QueryESQLControl;
export interface ESQLControlVariable {
    key: string;
    value: string | number | (string | number)[];
    type: ESQLVariableType;
    meta?: {
        controlledBy?: string;
        group?: string;
    };
}
export interface PublishesESQLVariable {
    esqlVariable$: PublishingSubject<ESQLControlVariable>;
}
export declare const apiPublishesESQLVariable: (unknownApi: unknown) => unknownApi is PublishesESQLVariable;
export interface PublishesESQLVariables {
    esqlVariables$: PublishingSubject<ESQLControlVariable[]>;
}
export declare const apiPublishesESQLVariables: (unknownApi: unknown) => unknownApi is PublishesESQLVariables;
interface HasVariableName {
    variable_name: string;
}
/**
 * Type guard to check if a control state object has a variable name property.
 * @param controlState - The control state object to check
 * @returns True if the control state has a defined variableName property
 */
export declare const controlHasVariableName: (controlState: unknown) => controlState is HasVariableName;
export {};

import { type DataView } from '@kbn/data-views-plugin/public';
import { Builder } from '@elastic/esql';
import type { EsqlQuery } from '@elastic/esql';
import type { ESQLFunction, ESQLCommand } from '@elastic/esql/types';
import type { FieldSummary } from '@kbn/esql-language/src/commands/registry/types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { type Terminal } from '../esql_fields_utils';
export declare const SUPPORTED_STATS_COMMAND_OPTION_FUNCTIONS: "categorize"[];
export type SupportedStatsFunction = (typeof SUPPORTED_STATS_COMMAND_OPTION_FUNCTIONS)[number];
export declare const isSupportedStatsFunction: (fnName: string) => fnName is SupportedStatsFunction;
export type SupportedFieldTypes = Exclude<keyof typeof Builder.expression.literal, 'nil' | 'numeric' | 'timespan'>;
export type FieldValue<T extends SupportedFieldTypes> = Parameters<(typeof Builder.expression.literal)[T]>[0] | unknown;
export interface StatsCommandSummary {
    command: ESQLCommand;
    aggregates: Record<string, FieldSummary>;
    grouping: Record<string, FieldSummary>;
}
export declare const isCategorizeFunctionWithFunctionArgument: (functionDefinition: ESQLFunction) => boolean;
export declare const removeBackticks: (str: string) => string;
/**
 * constrains the field value type to be one of the supported field value types, else we process as a string literal when building the expression
 */
export declare const isSupportedFieldType: (fieldType: unknown) => fieldType is SupportedFieldTypes;
/**
 * if value is a text or keyword field and it's not "aggregatable", we opt to use match phrase for the where command
 */
export declare const requiresMatchPhrase: (fieldName: string, dataViewFields: DataView["fields"]) => boolean | undefined;
/**
 * Returns the stats command to operate on, we operate on the last stats command in the query
 */
export declare function getStatsCommandToOperateOn(esqlQuery: EsqlQuery): ({
    command: ESQLCommand<string>;
    grouping: Record<string, FieldSummary>;
    aggregates: Record<string, FieldSummary>;
} & {
    index: number;
}) | null;
/**
 * Returns the data source command from the esql query, supports both the FROM and TS commands
 */
export declare function getESQLQueryDataSourceCommand(esqlQuery: EsqlQuery): ESQLCommand<'from' | 'ts'> | undefined;
/**
 * Returns runtime fields that are created within the query by the STATS command in the query
 */
export declare function getStatsCommandRuntimeFields(esqlQuery: EsqlQuery): Set<string>[];
/**
 * Returns the summary of the stats command at the given command index in the esql query
 */
export declare function getStatsCommandAtIndexSummary(esqlQuery: EsqlQuery, commandIndex: number): {
    command: ESQLCommand<string>;
    grouping: Record<string, FieldSummary>;
    aggregates: Record<string, FieldSummary>;
} | null;
/**
 * Returns the param definition for the given field name
 */
export declare function getFieldParamDefinition(fieldName: string, fieldTerminals: Array<Terminal>, esqlVariables: ESQLControlVariable[] | undefined): string | number | (string | number)[] | undefined;
export declare function getStatsGroupFieldType<T extends FieldSummary | undefined, R = T extends FieldSummary ? string : undefined>(groupByFields: T): R;

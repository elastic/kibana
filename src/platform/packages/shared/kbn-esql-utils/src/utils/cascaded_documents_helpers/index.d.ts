import { type AggregateQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { type SupportedFieldTypes, type FieldValue } from './utils';
type NodeType = 'group' | 'leaf';
export interface AppliedStatsFunction {
    identifier: string;
    aggregation: string;
}
export interface ESQLStatsQueryMeta {
    groupByFields: Array<{
        field: string;
        type: string;
    }>;
    appliedFunctions: AppliedStatsFunction[];
}
/**
 * This method is used to get the metadata on STATS command to drive the cascade experience from an ESQL query,
 * if a valid STATS command is found information about the group by fields and applied functions is returned.
 * This method will exclude queries contain commands that are not valid for the cascade experience,
 */
export declare const getESQLStatsQueryMeta: (queryString: string) => ESQLStatsQueryMeta;
export interface CascadeQueryArgs {
    /**
     * data view for the query
     */
    dataView: DataView;
    /**
     * anchor query for generating the next valid query
     */
    query: AggregateQuery;
    /**
     * ESQL variables for the query
     */
    esqlVariables: ESQLControlVariable[] | undefined;
    /**
     * Node type (group or leaf) for which we are constructing the cascade query
     */
    nodeType: NodeType;
    /**
     * Node path for the current node in the cascade experience we'd like to generate a query for
     */
    nodePath: string[];
    /**
     * Mapping of node paths to their corresponding values, used to populate the query with literal values
     */
    nodePathMap: Record<string, string>;
}
/**
 * Constructs a cascade query from the provided query, based on the node type, node path and node path map.
 */
export declare const constructCascadeQuery: ({ query, dataView, esqlVariables, nodeType, nodePath, nodePathMap, }: CascadeQueryArgs) => AggregateQuery | undefined;
/**
 * Handles the computation and appending of a filtering where clause,
 * for ES|QL query containing a stats command in the cascade layout experience
 */
export declare const appendFilteringWhereClauseForCascadeLayout: <T extends SupportedFieldTypes | string = SupportedFieldTypes | string>(query: string, esqlVariables: ESQLControlVariable[] | undefined, dataView: DataView, fieldName: string, value: T extends SupportedFieldTypes ? FieldValue<T> : unknown, operation: "+" | "-" | "is_not_null" | "is_null", fieldType?: T extends SupportedFieldTypes ? T : string) => string;
export {};

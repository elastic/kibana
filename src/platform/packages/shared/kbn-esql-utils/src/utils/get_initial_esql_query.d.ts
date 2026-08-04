import type { DataView } from '@kbn/data-views-plugin/public';
import { type Filter, type Query } from '@kbn/es-query';
/**
 * Builds an ES|QL query for the provided dataView
 * If there is @timestamp field in the index, we don't add the WHERE clause
 * If there is no @timestamp and there is a dataView timeFieldName, we add the WHERE clause with the timeFieldName
 * If the index pattern contains TSDB fields, we add the TS command, otherwise we add the FROM command
 * @param dataView
 * @param query
 * @param filters - DSL filters to convert to ES|QL WHERE clauses
 */
export declare function getInitialESQLQuery(dataView: DataView, query?: Query, filters?: Filter[]): string;

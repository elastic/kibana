import type { DataSourceProfileProviderParams } from '../profiles';
/**
 * Extracts the index pattern from the given ES|QL query or data view
 * @param options Options object
 * @returns The extracted index pattern or null
 */
export declare const extractIndexPatternFrom: ({ dataSource, dataView, query, }: Pick<DataSourceProfileProviderParams, "dataSource" | "dataView" | "query">) => string | null;

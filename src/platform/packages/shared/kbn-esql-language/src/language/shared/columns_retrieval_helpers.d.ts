import type { ESQLCallbacks } from '@kbn/esql-types';
import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import type { ESQLColumnData, GetColumnsByTypeFn } from '../../commands/registry/types';
export type ColumnsMap = Map<string, ESQLColumnData>;
export type GetColumnMapFn = () => Promise<ColumnsMap>;
export declare function getColumnsByTypeRetriever(query: ESQLAstQueryExpression, queryText: string, resourceRetriever?: ESQLCallbacks): {
    getColumnsByType: GetColumnsByTypeFn;
    getColumnMap: GetColumnMapFn;
};

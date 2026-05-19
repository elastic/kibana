import { type QueryOperator } from '@kbn/esql-composer';
export interface UseDiscoverLinkAndEsqlQueryParams {
    indexPattern?: string;
    whereClause?: QueryOperator;
}
export declare function useDiscoverLinkAndEsqlQuery({ indexPattern, whereClause, }: UseDiscoverLinkAndEsqlQueryParams): {
    discoverUrl: undefined;
    esqlQueryString: undefined;
} | {
    discoverUrl: string | undefined;
    esqlQueryString: string;
};

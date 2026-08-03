import { type QueryOperator } from '@kbn/esql-composer';
export interface UseDiscoverLinkAndEsqlQueryParams {
    indexPattern?: string;
    whereClause?: QueryOperator;
    unmappedFieldsPolicy?: 'NULLIFY' | 'LOAD';
}
export declare function useDiscoverLinkAndEsqlQuery({ indexPattern, whereClause, unmappedFieldsPolicy, }: UseDiscoverLinkAndEsqlQueryParams): {
    discoverUrl: undefined;
    esqlQueryString: undefined;
} | {
    discoverUrl: string | undefined;
    esqlQueryString: string;
};

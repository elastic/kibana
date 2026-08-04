import { where } from '@kbn/esql-composer';
type WhereClause = ReturnType<typeof where>;
export interface GenerateDiscoverLink {
    (whereClause?: Record<string, any>): string | undefined;
    (...clauses: WhereClause[]): string | undefined;
}
export declare function useGetGenerateDiscoverLink({ indexPattern, unmappedFieldsPolicy, }: {
    indexPattern?: string | (string | undefined)[];
    unmappedFieldsPolicy?: 'NULLIFY' | 'LOAD';
}): {
    generateDiscoverLink: GenerateDiscoverLink;
};
export declare const toESQLParamName: (str: string) => string;
export {};

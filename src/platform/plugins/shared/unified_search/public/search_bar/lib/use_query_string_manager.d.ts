import type { Query, AggregateQuery } from '@kbn/es-query';
import type { QueryStringContract } from '@kbn/data-plugin/public';
interface UseQueryStringProps {
    disabled?: boolean;
    query?: Query | AggregateQuery;
    queryStringManager: QueryStringContract;
}
export declare const useQueryStringManager: (props: UseQueryStringProps) => {
    query: AggregateQuery | {
        language: string;
        query: string | {
            [key: string]: any;
        };
    };
};
export {};

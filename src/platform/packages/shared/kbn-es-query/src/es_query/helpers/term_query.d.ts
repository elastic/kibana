import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
interface TermQueryOpts {
    queryEmptyString: boolean;
}
export declare function termQuery<T extends string>(field: T, value: string | boolean | number | undefined | null, opts?: TermQueryOpts): QueryDslQueryContainer[];
export {};

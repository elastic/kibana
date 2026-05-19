import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
export declare function termsQuery<T extends string>(field: T, values: Array<string | boolean | number>): QueryDslQueryContainer[];

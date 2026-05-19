import type { AsCodeQuery } from '@kbn/as-code-shared-schemas';
import type { Query } from '@kbn/es-query';
export declare function toAsCodeQuery(storedQuery: Query | undefined): AsCodeQuery | undefined;
export declare function toStoredQuery(asCodeQuery: AsCodeQuery | undefined): Query | undefined;

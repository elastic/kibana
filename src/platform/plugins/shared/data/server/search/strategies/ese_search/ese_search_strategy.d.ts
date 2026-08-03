import type { Observable } from 'rxjs';
import type { Logger, SharedGlobalConfig } from '@kbn/core/server';
import type { IEsSearchRequest } from '@kbn/search-types';
import type { IAsyncSearchRequestParams } from '../..';
import type { ISearchStrategy } from '../../types';
import type { SearchUsage } from '../../collectors/search';
import type { SearchConfigSchema } from '../../../config';
export declare const enhancedEsSearchStrategyProvider: (legacyConfig$: Observable<SharedGlobalConfig>, searchConfig: SearchConfigSchema, logger: Logger, usage?: SearchUsage, useInternalUser?: boolean, isServerless?: boolean) => ISearchStrategy<IEsSearchRequest<IAsyncSearchRequestParams>>;

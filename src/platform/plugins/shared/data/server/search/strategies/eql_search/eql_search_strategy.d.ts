import type { Logger } from '@kbn/core/server';
import type { SearchConfigSchema } from '../../../config';
import type { EqlSearchStrategyRequest, EqlSearchStrategyResponse } from '../../../../common';
import type { ISearchStrategy } from '../../types';
export declare const eqlSearchStrategyProvider: (searchConfig: SearchConfigSchema, logger: Logger) => ISearchStrategy<EqlSearchStrategyRequest, EqlSearchStrategyResponse>;

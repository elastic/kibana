import type { Logger } from '@kbn/core/server';
import type { ISearchStrategy } from '../../types';
import type { SqlSearchStrategyRequest, SqlSearchStrategyResponse } from '../../../../common';
import type { SearchConfigSchema } from '../../../config';
export declare const sqlSearchStrategyProvider: (searchConfig: SearchConfigSchema, logger: Logger, useInternalUser?: boolean) => ISearchStrategy<SqlSearchStrategyRequest, SqlSearchStrategyResponse>;

import type { Logger } from '@kbn/core/server';
import type { ISearchStrategy } from '../../types';
export declare const esqlSearchStrategyProvider: (logger: Logger, useInternalUser?: boolean) => ISearchStrategy<any, any>;

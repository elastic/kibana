import type { RefreshInterval } from '@kbn/data-service-server';
import type { InputTimeRange } from '../types';
export declare function areRefreshIntervalsDifferent(rangeA: RefreshInterval, rangeB: RefreshInterval): boolean;
export declare function areTimeRangesDifferent(rangeA: InputTimeRange, rangeB: InputTimeRange): boolean;

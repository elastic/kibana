import type { Moment } from 'moment';
import type { TimeRange } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-service-server';
export interface TimefilterConfig {
    timeDefaults: TimeRange;
    refreshIntervalDefaults: RefreshInterval;
    minRefreshIntervalDefault: number;
}
export type InputTimeRange = TimeRange | {
    from: Moment | string;
    to: Moment | string;
};
export type { TimeRangeBounds } from '../../../common';

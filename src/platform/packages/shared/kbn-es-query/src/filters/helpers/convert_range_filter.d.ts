import moment from 'moment';
import type { RangeFilter } from '../build_filters';
import type { TimeRange } from './types';
export declare function convertRangeFilterToTimeRange(filter: RangeFilter): {
    from: string | moment.Moment;
    to: string | moment.Moment;
};
export declare function convertRangeFilterToTimeRangeString(filter: RangeFilter): TimeRange;

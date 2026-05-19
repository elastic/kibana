import type { PublicMethodsOf } from '@kbn/utility-types';
import type { TimeRange } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-service-server';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimefilterConfig, InputTimeRange, TimeRangeBounds } from './types';
import type { NowProviderInternalContract } from '../../now_provider';
import type { TimeHistoryContract } from './time_history';
import type { AutoRefreshDoneFn } from './lib/auto_refresh_loop';
import type { TimefilterHook } from './use_timefilter';
export type { AutoRefreshDoneFn };
export declare class Timefilter {
    private readonly nowProvider;
    private enabledUpdated$;
    private timeUpdate$;
    private refreshIntervalUpdate$;
    private fetch$;
    private _time;
    private _isTimeTouched;
    private _refreshInterval;
    private _minRefreshInterval;
    private _isRefreshIntervalTouched;
    private _history;
    private _isTimeRangeSelectorEnabled;
    private _isAutoRefreshSelectorEnabled;
    private readonly timeDefaults;
    private readonly refreshIntervalDefaults;
    readonly useTimefilter: () => TimefilterHook;
    private readonly autoRefreshLoop;
    constructor(config: TimefilterConfig, timeHistory: TimeHistoryContract, nowProvider: NowProviderInternalContract);
    isTimeRangeSelectorEnabled(): boolean;
    isAutoRefreshSelectorEnabled(): boolean;
    isTimeTouched(): boolean;
    isRefreshIntervalTouched(): boolean;
    getEnabledUpdated$: () => import("rxjs").Observable<boolean>;
    getTimeUpdate$: () => import("rxjs").Observable<void>;
    getRefreshIntervalUpdate$: () => import("rxjs").Observable<void>;
    /**
     * Get an observable that emits when it is time to refetch data due to refresh interval
     * Each subscription to this observable resets internal interval
     * Emitted value is a callback {@link AutoRefreshDoneFn} that must be called to restart refresh interval loop
     * Apps should use this callback to start next auto refresh loop when view finished updating
     */
    getAutoRefreshFetch$: () => import("rxjs").Observable<AutoRefreshDoneFn>;
    triggerFetch: () => void;
    getFetch$: () => import("rxjs").Observable<void>;
    getTime: () => TimeRange;
    /**
     * Same as {@link getTime}, but also converts relative time range to absolute time range
     */
    getAbsoluteTime(): TimeRange;
    /**
     * Updates timefilter time.
     * Emits 'timeUpdate' and 'fetch' events when time changes
     * @param {Object} time
     * @property {string|moment} time.from
     * @property {string|moment} time.to
     */
    setTime: (time: InputTimeRange) => void;
    getRefreshInterval: () => Readonly<{} & {
        value: number;
        pause: boolean;
    }>;
    getMinRefreshInterval: () => number;
    /**
     * Set timefilter refresh interval.
     * @param {Object} refreshInterval
     * @property {number} time.value Refresh interval in milliseconds. Positive integer
     * @property {boolean} time.pause
     */
    setRefreshInterval: (refreshInterval: Partial<RefreshInterval>) => void;
    /**
     * Create a time filter that coerces all time values to absolute time.
     *
     * This is useful for creating a filter that ensures all ES queries will fetch the exact same data
     * and leverages ES query cache for performance improvement.
     *
     * One use case is keeping different elements embedded in the same UI in sync.
     */
    createFilter: (indexPattern: DataView, timeRange?: TimeRange) => import("@kbn/es-query").ScriptedRangeFilter | import("@kbn/es-query/src/filters/build_filters").MatchAllRangeFilter | import("@kbn/es-query").RangeFilter | undefined;
    /**
     * Create a time filter that converts only absolute time to ISO strings, it leaves relative time
     * values unchanged (e.g. "now-1").
     *
     * This is useful for sending datemath values to ES endpoints to generate reports over time.
     *
     * @note Consumers of this function need to ensure that the ES endpoint supports datemath.
     */
    createRelativeFilter: (indexPattern: DataView, timeRange?: TimeRange) => import("@kbn/es-query").ScriptedRangeFilter | import("@kbn/es-query/src/filters/build_filters").MatchAllRangeFilter | import("@kbn/es-query").RangeFilter | undefined;
    getBounds(): TimeRangeBounds;
    calculateBounds(timeRange: TimeRange): TimeRangeBounds;
    getActiveBounds(): TimeRangeBounds | undefined;
    /**
     * Show the time bounds selector part of the time filter
     */
    enableTimeRangeSelector: () => void;
    /**
     * Hide the time bounds selector part of the time filter
     */
    disableTimeRangeSelector: () => void;
    /**
     * Show the auto refresh part of the time filter
     */
    enableAutoRefreshSelector: () => void;
    /**
     * Hide the auto refresh part of the time filter
     */
    disableAutoRefreshSelector: () => void;
    getTimeDefaults(): TimeRange;
    getRefreshIntervalDefaults(): RefreshInterval;
}
export type TimefilterContract = PublicMethodsOf<Timefilter>;

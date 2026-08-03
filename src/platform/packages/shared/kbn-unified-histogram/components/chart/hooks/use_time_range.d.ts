import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import React from 'react';
import type { TimeRange } from '@kbn/data-plugin/common';
import type { UnifiedHistogramBucketInterval } from '../../../types';
export declare const useTimeRange: ({ uiSettings, bucketInterval, timeRange: { from, to }, timeInterval, isPlainRecord, timeField, }: {
    uiSettings: IUiSettingsClient;
    bucketInterval?: UnifiedHistogramBucketInterval;
    timeRange: TimeRange;
    timeInterval?: string;
    isPlainRecord?: boolean;
    timeField?: string;
}) => {
    timeRangeText: string;
    timeRangeDisplay: React.JSX.Element | null;
};

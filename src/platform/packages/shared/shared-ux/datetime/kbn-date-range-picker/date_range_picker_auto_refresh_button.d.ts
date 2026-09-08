import React from 'react';
export interface DateRangePickerAutoRefreshButtonProps {
    disabled: boolean;
    intervalMs: number;
    isPaused: boolean;
    onClick: () => void;
    secondsRemaining: number | null;
}
/**
 * Play / pause control for auto-refresh with a live `mm:ss` / `hh:mm:ss` countdown label.
 */
export declare function DateRangePickerAutoRefreshButton({ disabled, intervalMs, isPaused, onClick, secondsRemaining, }: DateRangePickerAutoRefreshButtonProps): React.JSX.Element;

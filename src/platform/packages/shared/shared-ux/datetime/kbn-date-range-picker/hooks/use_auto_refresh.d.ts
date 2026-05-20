/**
 * Manages an auto-refresh interval timer.
 *
 * @param isPaused - Whether the auto-refresh timer is paused.
 * @param intervalMs - The interval in milliseconds.
 * @param onRefresh - The callback to fire when the auto-refresh interval is reached.
 * @param refreshEpoch - Increment this value to reset the countdown immediately (e.g. when an
 *   external timer fires a refresh). `undefined` on initial render is ignored.
 *
 * When `isPaused` is false and `intervalMs > 0`, fires `onRefresh` repeatedly
 * at the given interval and tracks the seconds remaining until the next refresh.
 *
 * Pausing freezes the countdown; resuming continues from where it left off.
 * The countdown resets when `intervalMs` changes or when `refreshEpoch` increments.
 * `onRefresh` is kept in a ref so changing it never restarts the timer.
 *
 * @returns The seconds remaining until the next refresh, or `null` when the interval is invalid.
 */
export declare function useAutoRefresh({ isPaused, intervalMs, onRefresh, refreshEpoch, }: {
    isPaused: boolean;
    intervalMs: number;
    onRefresh: (() => void) | undefined;
    refreshEpoch?: number;
}): {
    secondsRemaining: number | null;
};

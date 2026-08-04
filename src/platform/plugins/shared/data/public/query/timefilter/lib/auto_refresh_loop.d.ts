export type AutoRefreshDoneFn = () => void;
/**
 * Creates a loop for timepicker's auto refresh
 * It has a "confirmation" mechanism:
 * When auto refresh loop emits, it won't continue automatically,
 * until each subscriber calls received `done` function.
 *
 * Also, it will pause when the page is not visible.
 *
 * @internal
 */
export declare const createAutoRefreshLoop: () => {
    stop: () => void;
    start: (timeout: number) => void;
    loop$: import("rxjs").Observable<AutoRefreshDoneFn>;
};

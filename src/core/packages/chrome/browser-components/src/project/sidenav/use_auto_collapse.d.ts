/**
 * Whether the sidenav should be auto-collapsed for the current window size.
 *
 * Main app width is approximated as viewport width minus expanded nav width and
 * `sidebarWidth`. Below the collapse threshold we collapse; above the expand
 * threshold we expand. Between the two thresholds we leave the nav unchanged so
 * small resizes near the edge do not keep toggling it.
 */
export declare const useAutoCollapse: (sidebarWidth: number) => boolean;

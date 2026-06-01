import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ResizableLayoutProps } from '@kbn/resizable-layout';
export declare const CHART_HIDDEN_KEY = "chartHidden";
export declare const TABLE_HIDDEN_KEY = "tableHidden";
export declare const HISTOGRAM_HEIGHT_KEY = "histogramHeight";
export declare const HISTOGRAM_BREAKDOWN_FIELD_KEY = "histogramBreakdownField";
/**
 * Get the chart hidden state from local storage
 */
export declare const getChartHidden: (storage: Storage, localStorageKeyPrefix: string) => boolean | undefined;
/**
 * Get the table hidden state from local storage
 */
export declare const getTableHidden: (storage: Storage, localStorageKeyPrefix: string) => boolean | undefined;
/**
 * Get the top panel height from local storage
 */
export declare const getTopPanelHeight: (storage: Storage, localStorageKeyPrefix: string) => ResizableLayoutProps["fixedPanelSize"] | undefined;
/**
 * Get the breakdown field from local storage
 */
export declare const getBreakdownField: (storage: Storage, localStorageKeyPrefix: string) => string | undefined;
/**
 * Set the chart hidden state in local storage
 */
export declare const setChartHidden: (storage: Storage, localStorageKeyPrefix: string, chartHidden: boolean | undefined) => false | void;
/**
 * Set the table hidden state in local storage
 */
export declare const setTableHidden: (storage: Storage, localStorageKeyPrefix: string, tableHidden: boolean | undefined) => false | void;
/**
 * Set the top panel height in local storage
 */
export declare const setTopPanelHeight: (storage: Storage, localStorageKeyPrefix: string, topPanelHeight: ResizableLayoutProps["fixedPanelSize"]) => false | void;
/**
 * Set the breakdown field in local storage
 */
export declare const setBreakdownField: (storage: Storage, localStorageKeyPrefix: string, breakdownField: string | undefined) => false | void;

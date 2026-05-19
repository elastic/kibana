import { ES_FIELD_TYPES } from '@kbn/field-types';
export declare const METRICS_GRID_CLASS = "metricsGrid";
export declare const METRICS_GRID_FULL_SCREEN_CLASS = "metricsGrid--fullScreen";
export declare const METRICS_GRID_RESTRICT_BODY_CLASS = "metricsGrid--restrictBody";
export declare const METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ = "metricsExperienceBreakdownSelector";
export declare const METRICS_GRID_PAGINATION_DATA_TEST_SUBJ = "metricsExperienceGridPagination";
export declare const MAX_DIMENSIONS_SELECTIONS = 5;
export declare const PAGE_SIZE = 20;
export declare const DEBOUNCE_TIME = 300;
export declare const ACTION_COPY_TO_DASHBOARD = "ACTION_METRICS_EXPERIENCE_COPY_TO_DASHBOARD";
export declare const ACTION_VIEW_DETAILS = "ACTION_METRICS_EXPERIENCE_VIEW_DETAILS";
export declare const ACTION_EXPLORE_IN_DISCOVER_TAB = "ACTION_METRICS_EXPERIENCE_EXPLORE_IN_DISCOVER_TAB";
export declare const ACTION_OPEN_IN_DISCOVER = "ACTION_OPEN_IN_DISCOVER";
/** Set of numeric field types used for metrics */
export declare const NUMERIC_TYPES: ES_FIELD_TYPES[];
export declare const DIMENSION_TYPES: ES_FIELD_TYPES[];
export declare const ALLOWED_METRIC_TYPES: string[];

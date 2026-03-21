import type { EuiDataGridStyle } from '@elastic/eui';
export { DataGridDensity } from '@kbn/discover-utils';
export declare const DEFAULT_CONTROL_COLUMN_WIDTH = 24;
export declare const SCORE_COLUMN_NAME = "_score";
export declare const DEFAULT_ROWS_PER_PAGE = 100;
export declare const MAX_LOADED_GRID_ROWS = 10000;
export declare const ROWS_PER_PAGE_OPTIONS: number[];
export declare const DEFAULT_PAGINATION_MODE = "multiPage";
/**
 * Row height might be a value from -1 to 20
 * A value of -1 automatically adjusts the row height to fit the contents.
 * A value from 1 to 20 represents number of lines of Document explorer row to display.
 */
export declare const ROWS_HEIGHT_OPTIONS: {
    readonly auto: -1;
    readonly single: 1;
    readonly default: 3;
};
export declare const defaultRowLineHeight = "1.6em";
export declare const defaultMonacoEditorWidth = 370;
export declare const defaultTimeColumnWidth = 212;
export declare const kibanaJSON = "kibana-json";
export declare const DATA_GRID_STYLE_COMPACT: EuiDataGridStyle;
export declare const DATA_GRID_STYLE_NORMAL: EuiDataGridStyle;
export declare const DATA_GRID_STYLE_EXPANDED: EuiDataGridStyle;
export declare const DATA_GRID_STYLE_DEFAULT: EuiDataGridStyle;
export declare const toolbarVisibility: {
    showColumnSelector: {
        allowHide: boolean;
        allowReorder: boolean;
    };
};

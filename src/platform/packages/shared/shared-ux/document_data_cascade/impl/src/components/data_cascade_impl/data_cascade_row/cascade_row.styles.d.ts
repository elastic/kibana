import type { UseEuiTheme } from '@elastic/eui';
import type { CascadeSizing } from '../types';
export declare const rootRowAttribute: "root";
export declare const childRowAttribute: "sub-group";
export declare const styles: (euiTheme: UseEuiTheme["euiTheme"], isExpandedChildRow: boolean, rowDepth: number, size: CascadeSizing) => {
    rowStickyHeaderInner: import("@emotion/utils").SerializedStyles;
    rowWrapper: import("@emotion/utils").SerializedStyles;
    rowInner: import("@emotion/utils").SerializedStyles;
};

import type { UseEuiTheme } from '@elastic/eui';
import type { CascadeSizing } from '../types';
export declare const rootRowAttribute: "root";
export declare const childRowAttribute: "sub-group";
export declare const styles: (euiTheme: UseEuiTheme["euiTheme"], isExpandedChildRow: boolean, rowDepth: number, size: CascadeSizing) => {
    rowStickyHeaderInner: import("@emotion/react").SerializedStyles;
    rowWrapper: import("@emotion/react").SerializedStyles;
    rowInner: import("@emotion/react").SerializedStyles;
};

import type { LayoutState } from './layout.types';
export declare const useLayoutStyles: (layoutState: LayoutState) => {
    css: import("@emotion/utils").SerializedStyles;
    style: {
        gridTemplateColumns: string;
        gridTemplateRows: string;
    };
};

import type { LayoutState } from './layout.types';
export declare const useLayoutStyles: (layoutState: LayoutState) => {
    css: import("@emotion/react").SerializedStyles;
    style: {
        gridTemplateColumns: string;
        gridTemplateRows: string;
    };
};

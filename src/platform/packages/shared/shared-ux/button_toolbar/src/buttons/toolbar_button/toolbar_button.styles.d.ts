import type { UseEuiTheme } from '@elastic/eui';
export declare const fontWeightDefinitions: (euiTheme: UseEuiTheme["euiTheme"]) => {
    bold: import("csstype").Property.FontWeight | undefined;
    normal: import("csstype").Property.FontWeight | undefined;
};
export declare const ToolbarButtonStyles: ({ euiTheme }: UseEuiTheme) => {
    default: {
        border: string;
    };
    emptyButton: {
        backgroundColor: string;
        border: string;
        color: string;
    };
    buttonPositions: {
        left: {
            borderTopRightRadius: number;
            borderBottomRightRadius: number;
        };
        right: {
            borderTopLeftRadius: number;
            borderBottomLeftRadius: number;
            borderLeft: string;
        };
        center: {
            borderRadius: number;
            borderLeft: string;
        };
    };
};

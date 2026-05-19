import type { EuiThemeComputed } from '@elastic/eui';
export declare const EDITOR_INITIAL_HEIGHT = 80;
export declare const EDITOR_INITIAL_HEIGHT_INLINE_EDITING = 140;
export declare const EDITOR_MIN_HEIGHT = 40;
export declare const EDITOR_MAX_HEIGHT = 400;
export declare const RESIZABLE_CONTAINER_INITIAL_HEIGHT = 190;
export declare const esqlEditorStyles: (euiTheme: EuiThemeComputed, editorHeight: number, editorIsInline: boolean, hasOutline: boolean) => {
    editorContainer: {
        position: "relative";
        left: number;
        right: number;
        zIndex: number;
        height: string;
        border: string | number | undefined;
    };
    resizableContainer: {
        display: string;
        width: string;
        alignItems: string;
        borderBottom: string;
        overflow: string;
    };
    bottomContainer: {
        paddingLeft: string;
        paddingRight: string;
        paddingTop: string;
        paddingBottom: string;
        width: string;
        position: "relative";
        marginTop: number;
        marginLeft: number;
        marginBottom: number;
        borderBottomLeftRadius: number;
        borderBottomRightRadius: number;
    };
    historyContainer: {
        border: string;
        width: string;
        position: "relative";
        marginTop: number;
        marginLeft: number;
        marginBottom: number;
        borderBottomLeftRadius: number;
        borderBottomRightRadius: number;
    };
};

import type { monaco } from '@kbn/monaco';
/**
 * Custom resize detection hook that doesn't depend on external plugins
 * Uses native ResizeObserver API for efficient resize detection
 */
export declare const useResizeChecker: () => {
    containerRef: import("react").MutableRefObject<HTMLDivElement | null>;
    setupResizeChecker: (editor: monaco.editor.IStandaloneCodeEditor, options?: {
        flyoutMode?: boolean;
    }) => void;
    destroyResizeChecker: () => void;
};

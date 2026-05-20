import type { monaco } from '@kbn/monaco';
/**
 * Hook that returns functions for setting up and destroying a {@link ResizeChecker}
 * for a Monaco editor.
 */
export declare const useResizeCheckerUtils: () => {
    setupResizeChecker: (divElement: HTMLDivElement, editor: monaco.editor.IStandaloneCodeEditor) => void;
    destroyResizeChecker: () => void;
};

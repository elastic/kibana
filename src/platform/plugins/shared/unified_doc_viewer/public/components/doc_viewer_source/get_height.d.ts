import type { monaco } from '@kbn/monaco';
export declare const DEFAULT_MARGIN_BOTTOM = 16;
export declare function getTabContentAvailableHeight(elementRef: HTMLElement | undefined, decreaseAvailableHeightBy: number): number;
export declare function getHeight(editor: monaco.editor.IStandaloneCodeEditor, decreaseAvailableHeightBy: number): number;

/**
 * When using custom fonts with monaco need to call `monaco.editor.remeasureFonts()` when custom fonts finished loading
 * Otherwise initial measurements on fallback font are used which causes visual glitches in the editor
 */
export declare const remeasureFonts: () => void;

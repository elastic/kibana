/**
 * @notice
 * This code is forked from the `react-monaco-editor`
 * https://github.com/react-monaco-editor/react-monaco-editor/blob/975cc47b5cb411ee2ffcbdb973daa9342e81a805/src/editor.tsx
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-present Leon Shi
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import type { monaco as monacoEditor } from '@kbn/monaco';
import * as React from 'react';
export type EditorConstructionOptions = monacoEditor.editor.IStandaloneEditorConstructionOptions;
export type EditorWillMount = (monaco: typeof monacoEditor) => void | EditorConstructionOptions;
export type EditorDidMount = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => void;
export type EditorWillUnmount = (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) => void | EditorConstructionOptions;
export type ChangeHandler = (value: string, event: monacoEditor.editor.IModelContentChangedEvent) => void;
export interface MonacoEditorProps {
    /**
     * Width of editor. Defaults to 100%.
     */
    width?: string | number;
    /**
     * Height of editor. Defaults to 100%.
     */
    height?: string | number;
    /**
     * The initial value of the auto created model in the editor.
     */
    defaultValue?: string;
    /**
     * Value of the auto created model in the editor.
     * If you specify `null` or `undefined` for this property, the component behaves in uncontrolled mode.
     * Otherwise, it behaves in controlled mode.
     */
    value?: string | null;
    /**
     * The initial language of the auto created model in the editor. Defaults to 'javascript'.
     */
    language?: string;
    /**
     * Theme to be used for rendering.
     * The current out-of-the-box available themes are: 'vs' (default), 'vs-dark', 'hc-black'.
     * You can create custom themes via `monaco.editor.defineTheme`.
     */
    theme?: string | null;
    /**
     * Optional string classname to append to the editor.
     */
    className?: string | null;
    /**
     * Refer to Monaco interface {monaco.editor.IStandaloneEditorConstructionOptions}.
     */
    options?: monacoEditor.editor.IStandaloneEditorConstructionOptions;
    /**
     * An event emitted before the editor mounted (similar to componentWillMount of React).
     */
    editorWillMount?: EditorWillMount;
    /**
     * An event emitted when the editor has been mounted (similar to componentDidMount of React).
     */
    editorDidMount?: EditorDidMount;
    /**
     * An event emitted before the editor unmount (similar to componentWillUnmount of React).
     */
    editorWillUnmount?: EditorWillUnmount;
    /**
     * An event emitted when the content of the current model has changed.
     */
    onChange?: ChangeHandler;
    /**
     * Optional z-index to override the default z-index of the overflow widgets container.
     */
    overflowWidgetsContainerZIndexOverride?: number;
}
export declare const OVERFLOW_WIDGETS_TEST_ID = "kbnCodeEditorEditorOverflowWidgetsContainer";
export declare function MonacoEditor({ width, height, value, defaultValue, language, theme, options, editorWillMount, editorDidMount, editorWillUnmount, onChange, className, overflowWidgetsContainerZIndexOverride, }: MonacoEditorProps): React.JSX.Element;
export declare namespace MonacoEditor {
    var displayName: string;
}

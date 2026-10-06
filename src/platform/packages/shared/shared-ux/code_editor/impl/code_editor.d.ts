import React from 'react';
import { monaco } from '@kbn/monaco';
import type { Interpolation, Theme } from '@emotion/react';
import { type MonacoEditorProps as ReactMonacoEditorProps } from './react_monaco_editor';
import { type ContextMenuAction } from './mods';
export interface CodeEditorProps extends Pick<ReactMonacoEditorProps, 'overflowWidgetsContainerZIndexOverride'> {
    /** Width of editor. Defaults to 100%. */
    width?: string | number;
    /** Height of editor. Defaults to 100px. */
    height?: string | number;
    /** ID of the editor language */
    languageId: string;
    /** Value of the editor */
    value: string;
    /** Function invoked when text in editor is changed */
    onChange?: (value: string, event: monaco.editor.IModelContentChangedEvent) => void;
    /**
     * Options for the Monaco Code Editor
     * Documentation of options can be found here:
     * https://microsoft.github.io/monaco-editor/docs.html#interfaces/editor.IStandaloneEditorConstructionOptions.html
     */
    options?: monaco.editor.IStandaloneEditorConstructionOptions;
    /**
     * Suggestion provider for autocompletion
     * Documentation for the provider can be found here:
     * https://microsoft.github.io/monaco-editor/docs.html#interfaces/languages.CompletionItemProvider.html
     */
    suggestionProvider?: monaco.languages.CompletionItemProvider;
    /**
     * Signature provider for function parameter info
     * Documentation for the provider can be found here:
     * https://microsoft.github.io/monaco-editor/docs.html#interfaces/languages.SignatureHelpProvider.html
     */
    signatureProvider?: monaco.languages.SignatureHelpProvider;
    /**
     * Hover provider for hover documentation
     * Documentation for the provider can be found here:
     * https://microsoft.github.io/monaco-editor/docs.html#interfaces/languages.HoverProvider.html
     */
    hoverProvider?: monaco.languages.HoverProvider;
    /**
     * Inline completions provider for inline suggestions
     * Documentation for the provider can be found here:
     * https://microsoft.github.io/monaco-editor/docs.html#interfaces/languages.InlineCompletionsProvider.html
     */
    inlineCompletionsProvider?: monaco.languages.InlineCompletionsProvider;
    /**
     * Language config provider for bracket
     * Documentation for the provider can be found here:
     * https://microsoft.github.io/monaco-editor/docs.html#interfaces/languages.LanguageConfiguration.html
     */
    languageConfiguration?: monaco.languages.LanguageConfiguration;
    /**
     * CodeAction provider for code actions on markers feedback
     * Documentation for the provider can be found here:
     * https://microsoft.github.io/monaco-editor/docs.html#interfaces/languages.CodeActionProvider.html
     */
    codeActions?: monaco.languages.CodeActionProvider;
    /**
     * Document highlight provider for highlighting all occurrences of a symbol
     * Documentation for the provider can be found here:
     * https://microsoft.github.io/monaco-editor/docs.html#interfaces/languages.DocumentHighlightProvider.html
     */
    documentHighlightProvider?: monaco.languages.DocumentHighlightProvider;
    /**
     * Function called before the editor is mounted in the view
     */
    editorWillMount?: () => void;
    /**
     * Function called before the editor is mounted in the view
     * and completely replaces the setup behavior called by the component
     */
    overrideEditorWillMount?: () => void;
    /**
     * Function called after the editor is mounted in the view
     */
    editorDidMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    editorWillUnmount?: () => void;
    /**
     * Should the editor use a transparent background
     */
    transparentBackground?: boolean;
    /**
     * Should the editor be rendered using the fullWidth EUI attribute
     */
    fullWidth?: boolean;
    placeholder?: string;
    /**
     * Accessible name for the editor. (Defaults to "Code editor")
     */
    'aria-label'?: string;
    /**
     * ID of the element that describes the editor.
     */
    'aria-describedby'?: string;
    isCopyable?: boolean;
    allowFullScreen?: boolean;
    /**
     * Alternate text to display, when an attempt is made to edit read only content. (Defaults to "Cannot edit in read-only editor")
     */
    readOnlyMessage?: string;
    /**
     * Enables the editor to grow vertically to fit its content.
     * This option overrides the `height` option.
     */
    fitToContent?: {
        minLines?: number;
        maxLines?: number;
    };
    /**
     * Enables the editor to get disabled when pressing ESC to resolve focus trapping for accessibility.
     */
    accessibilityOverlayEnabled?: boolean;
    /**
     * Enables the Search bar functionality in the editor. Disabled by default.
     */
    enableFindAction?: boolean;
    dataTestSubj?: string;
    /**
     * Custom CSS class to apply to the container
     */
    classNameCss?: Interpolation<Theme>;
    /**
     * Enables a custom context menu with Cut, Copy, Paste actions. Disabled by default.
     */
    enableCustomContextMenu?: boolean;
    /**
     * If the custom context menu is enable through {@link enableCustomContextMenu},
     * this prop allows adding more custom menu actions, on top of the default Cut, Copy, and Paste actions.
     */
    customContextMenuActions?: ContextMenuAction[];
    /**
     * Optional html id for accessibility labeling
     */
    htmlId?: string;
    /**
     * Enables clickable links in the editor. URLs will be underlined and can be opened
     * in a new tab using Cmd/Ctrl+Click. Disabled by default.
     */
    links?: boolean;
    /**
     * Callbacks for when editor is focused/blurred
     */
    onFocus?: () => void;
    onBlur?: () => void;
}
export declare const CodeEditor: React.FC<CodeEditorProps>;

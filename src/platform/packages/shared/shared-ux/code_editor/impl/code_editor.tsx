/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  htmlIdGenerator,
  EuiToolTip,
  keys,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import {
  monaco,
  CODE_EDITOR_DEFAULT_THEME_ID,
  CODE_EDITOR_TRANSPARENT_THEME_ID,
} from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Interpolation, Theme } from '@emotion/react';
import { css, Global } from '@emotion/react';
import {
  MonacoEditor as ReactMonacoEditor,
  type MonacoEditorProps as ReactMonacoEditorProps,
} from './react_monaco_editor';
import { remeasureFonts } from './utils/remeasure_fonts';
import {
  type ContextMenuAction,
  useCopy,
  useContextMenuUtils,
  useFullScreen,
  usePlaceholder,
  useFitToContent,
  ReBroadcastMouseDownEvents,
} from './mods';
import { styles } from './editor.styles';

export interface CodeEditorProps
  extends Pick<ReactMonacoEditorProps, 'overflowWidgetsContainerZIndexOverride'> {
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

export const CodeEditor: React.FC<CodeEditorProps> = ({
  languageId,
  value,
  onChange,
  width,
  height,
  options,
  overrideEditorWillMount,
  editorDidMount,
  editorWillMount,
  editorWillUnmount,
  transparentBackground,
  suggestionProvider,
  signatureProvider,
  hoverProvider,
  inlineCompletionsProvider,
  placeholder,
  languageConfiguration,
  codeActions,
  'aria-label': ariaLabel = i18n.translate('sharedUXPackages.codeEditor.ariaLabel', {
    defaultMessage: 'Code Editor',
  }),
  'aria-describedby': ariaDescribedBy,
  isCopyable = false,
  allowFullScreen = false,
  readOnlyMessage = i18n.translate('sharedUXPackages.codeEditor.readOnlyMessage', {
    defaultMessage: 'Cannot edit in read-only editor',
  }),
  fitToContent,
  accessibilityOverlayEnabled = true,
  enableFindAction,
  dataTestSubj = 'kibanaCodeEditor',
  classNameCss,
  enableCustomContextMenu = false,
  customContextMenuActions = [],
  htmlId,
  links = false,
  onFocus,
  onBlur,
  overflowWidgetsContainerZIndexOverride,
}) => {
  const { euiTheme } = useEuiTheme();
  const { registerContextMenuActions, unregisterContextMenuActions } = useContextMenuUtils();

  // We need to be able to mock the MonacoEditor in our test in order to not test implementation
  // detail and not have to call methods on the <CodeEditor /> component instance.
  const MonacoEditor: typeof ReactMonacoEditor = useMemo(() => {
    const isMockedComponent =
      typeof ReactMonacoEditor === 'function' && ReactMonacoEditor.name === 'JestMockEditor';
    return isMockedComponent
      ? (ReactMonacoEditor as unknown as () => typeof ReactMonacoEditor)()
      : ReactMonacoEditor;
  }, []);

  const { FullScreenDisplay, FullScreenButton, isFullScreen, setIsFullScreen, onKeyDown } =
    useFullScreen({
      allowFullScreen,
    });

  const isReadOnly = options?.readOnly ?? false;

  const [_editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const isSuggestionMenuOpen = useRef(false);
  const editorHint = useRef<HTMLDivElement>(null);
  const textboxMutationObserver = useRef<MutationObserver | null>(null);

  const [isHintActive, setIsHintActive] = useState(true);

  const startEditing = useCallback(() => {
    setIsHintActive(false);
    _editor?.focus();
    onFocus?.();
  }, [_editor, onFocus]);

  const stopEditing = useCallback(() => {
    setIsHintActive(true);
  }, []);

  const onKeyDownHint = useCallback(
    (ev: React.KeyboardEvent) => {
      if (ev.key === keys.ENTER) {
        ev.preventDefault();
        startEditing();
      }
    },
    [startEditing]
  );

  const onKeydownMonaco = useCallback(
    (ev: monaco.IKeyboardEvent, editor: monaco.editor.IStandaloneCodeEditor) => {
      if (ev.keyCode === monaco.KeyCode.Escape) {
        const inspectTokensWidget = editor?.getContribution(
          'editor.contrib.inspectTokens'
          // @ts-expect-errors -- "_widget" is not part of the TS interface but does exist
        )?._widget;
        // If the inspect tokens widget is open then we want to let monaco handle ESCAPE for it,
        // otherwise widget will not close.
        if (inspectTokensWidget) return;
        // If the autocompletion context menu is open then we want to let ESCAPE close it but
        // **not** exit out of editing mode.
        if (!isSuggestionMenuOpen.current) {
          ev.preventDefault();
          ev.stopPropagation();
          stopEditing();
          editorHint.current?.focus();
        }
        setIsFullScreen(false);
      }
    },
    [stopEditing, setIsFullScreen]
  );

  const onBlurMonaco = useCallback(() => {
    stopEditing();
    onBlur?.();
  }, [stopEditing, onBlur]);

  const renderPrompt = useCallback(() => {
    const enterKey = (
      <strong>
        {i18n.translate('sharedUXPackages.codeEditor.enterKeyLabel', {
          defaultMessage: 'Enter',
          description:
            'The name used for the Enter key on keyword. Will be {key} in sharedUXPackages.codeEditor.startEditing(ReadOnly).',
        })}
      </strong>
    );

    const escapeKey = (
      <strong>
        {i18n.translate('sharedUXPackages.codeEditor.escapeKeyLabel', {
          defaultMessage: 'Esc',
          description:
            'The label of the Escape key as printed on the keyboard. Will be {key} inside sharedUXPackages.codeEditor.stopEditing(ReadOnly).',
        })}
      </strong>
    );

    return (
      <EuiToolTip
        data-test-subj="codeEditorAccessibilityOverlay"
        display="block"
        content={
          <>
            <p>
              {isReadOnly ? (
                <FormattedMessage
                  id="sharedUXPackages.codeEditor.startEditingReadOnly"
                  defaultMessage="Press {key} to start interacting with the code."
                  values={{ key: enterKey }}
                />
              ) : (
                <FormattedMessage
                  id="sharedUXPackages.codeEditor.startEditing"
                  defaultMessage="Press {key} to start editing."
                  values={{ key: enterKey }}
                />
              )}
            </p>
            <p>
              {isReadOnly ? (
                <FormattedMessage
                  id="sharedUXPackages.codeEditor.stopEditingReadOnly"
                  defaultMessage="Press {key} to stop interacting with the code."
                  values={{ key: escapeKey }}
                />
              ) : (
                <FormattedMessage
                  id="sharedUXPackages.codeEditor.stopEditing"
                  defaultMessage="Press {key} to stop editing."
                  values={{ key: escapeKey }}
                />
              )}
            </p>
          </>
        }
      >
        <div
          css={[
            styles.keyboardHint(euiTheme),
            !isHintActive &&
              css`
                display: none;
              `,
          ]}
          id={htmlId ?? htmlIdGenerator('codeEditor')()}
          ref={editorHint}
          tabIndex={0}
          role="button"
          onClick={startEditing}
          onKeyDown={onKeyDownHint}
          onFocus={onFocus}
          onBlur={onBlur}
          aria-label={i18n.translate('sharedUXPackages.codeEditor.codeEditorEditButton', {
            defaultMessage: '{codeEditorAriaLabel}, activate edit mode',
            values: {
              codeEditorAriaLabel: ariaLabel,
            },
          })}
          data-test-subj="codeEditorHint"
          data-code-hint-status={isHintActive ? 'active' : 'inactive'}
        />
      </EuiToolTip>
    );
  }, [
    isHintActive,
    isReadOnly,
    euiTheme,
    startEditing,
    onKeyDownHint,
    ariaLabel,
    htmlId,
    onFocus,
    onBlur,
  ]);

  const _editorWillMount = useCallback<NonNullable<ReactMonacoEditorProps['editorWillMount']>>(
    (__monaco) => {
      if (__monaco !== monaco) {
        throw new Error('react-monaco-editor is using a different version of monaco');
      }

      if (overrideEditorWillMount) {
        overrideEditorWillMount();
        return;
      }

      editorWillMount?.();

      monaco.languages.onLanguage(languageId, () => {
        if (suggestionProvider) {
          monaco.languages.registerCompletionItemProvider(languageId, suggestionProvider);
        }

        if (signatureProvider) {
          monaco.languages.registerSignatureHelpProvider(languageId, signatureProvider);
        }

        if (hoverProvider) {
          monaco.languages.registerHoverProvider(languageId, hoverProvider);
        }

        if (inlineCompletionsProvider) {
          monaco.languages.registerInlineCompletionsProvider(languageId, inlineCompletionsProvider);
        }

        if (languageConfiguration) {
          monaco.languages.setLanguageConfiguration(languageId, languageConfiguration);
        }

        if (codeActions) {
          monaco.languages.registerCodeActionProvider(languageId, codeActions);
        }
      });

      monaco.editor.addKeybindingRule({
        // eslint-disable-next-line no-bitwise
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
        command: enableFindAction ? 'actions.find' : null,
      });
    },
    [
      overrideEditorWillMount,
      editorWillMount,
      languageId,
      suggestionProvider,
      signatureProvider,
      hoverProvider,
      inlineCompletionsProvider,
      codeActions,
      languageConfiguration,
      enableFindAction,
    ]
  );

  const _editorDidMount = useCallback<NonNullable<ReactMonacoEditorProps['editorDidMount']>>(
    (editor, __monaco) => {
      if (__monaco !== monaco) {
        throw new Error('react-monaco-editor is using a different version of monaco');
      }

      remeasureFonts();

      const textbox = editor.getDomNode()?.getElementsByTagName('textarea')[0];
      if (textbox) {
        // Make sure the textarea is not directly accessible with TAB
        textbox.tabIndex = -1;

        // The Monaco editor seems to override the tabindex and set it back to "0"
        // so we make sure that whenever the attributes change the tabindex stays at -1
        textboxMutationObserver.current = new MutationObserver(function onTextboxAttributeChange() {
          if (textbox.tabIndex >= 0) {
            textbox.tabIndex = -1;
          }
        });
        textboxMutationObserver.current.observe(textbox, { attributes: true });
      }

      editor.onKeyDown((ev: monaco.IKeyboardEvent) => {
        onKeydownMonaco(ev, editor);
      });
      editor.onDidBlurEditorText(onBlurMonaco);

      const messageContribution = editor.getContribution('editor.contrib.messageController');
      editor.onDidAttemptReadOnlyEdit(() => {
        // @ts-expect-error the show message API does exist and is documented here
        // https://github.com/microsoft/vscode/commit/052f02175f4752c36024c18cfbca4e13403e10c3
        messageContribution?.showMessage(readOnlyMessage, editor.getPosition());
      });

      // "widget" is not part of the TS interface but does exist
      // @ts-expect-errors
      const suggestionWidget = editor.getContribution('editor.contrib.suggestController')?.widget
        ?.value;

      // As I haven't found official documentation for "onDidShow" and "onDidHide"
      // we guard from possible changes in the underlying lib
      if (suggestionWidget && suggestionWidget.onDidShow && suggestionWidget.onDidHide) {
        suggestionWidget.onDidShow(() => {
          isSuggestionMenuOpen.current = true;
        });
        suggestionWidget.onDidHide(() => {
          isSuggestionMenuOpen.current = false;
        });
      }

      if (enableCustomContextMenu) {
        registerContextMenuActions({
          editor,
          enableWriteActions: !isReadOnly,
          customActions: customContextMenuActions,
        });
      }

      editorDidMount?.(editor);
      setEditor(editor);
    },
    [
      editorDidMount,
      onBlurMonaco,
      onKeydownMonaco,
      readOnlyMessage,
      enableCustomContextMenu,
      registerContextMenuActions,
      isReadOnly,
      customContextMenuActions,
    ]
  );

  const _editorWillUnmount = useCallback<NonNullable<ReactMonacoEditorProps['editorWillUnmount']>>(
    (editor) => {
      if (enableCustomContextMenu) {
        unregisterContextMenuActions();
      }

      editorWillUnmount?.();

      // Clear the stored editor reference before it gets disposed, to avoid downstream
      // effects/hooks attempting to call into a disposed editor instance.
      setEditor(null);

      const model = editor.getModel();
      model?.dispose();
    },
    [editorWillUnmount, enableCustomContextMenu, unregisterContextMenuActions]
  );

  useEffect(() => {
    return () => {
      textboxMutationObserver.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    // apply aria described by on editor element
    if (_editor && ariaDescribedBy) {
      _editor
        .getDomNode()
        ?.querySelector('textarea[aria-roledescription="editor"]')
        ?.setAttribute('aria-describedby', ariaDescribedBy);
    }
  }, [_editor, ariaDescribedBy]);

  useFitToContent({ editor: _editor, fitToContent, isFullScreen });
  usePlaceholder({ placeholder, euiTheme, editor: _editor, value });

  const { CopyButton } = useCopy({ isCopyable, value });

  const theme =
    options?.theme ??
    (transparentBackground ? CODE_EDITOR_TRANSPARENT_THEME_ID : CODE_EDITOR_DEFAULT_THEME_ID);

  return (
    <div
      css={styles.container}
      onKeyDown={onKeyDown}
      data-test-subj={dataTestSubj}
      className="kibanaCodeEditor"
    >
      <Global styles={classNameCss} />
      {accessibilityOverlayEnabled && renderPrompt()}
      <FullScreenDisplay>
        {allowFullScreen || isCopyable ? (
          <div
            css={
              isFullScreen
                ? [styles.controls.base(euiTheme), styles.controls.fullscreen(euiTheme)]
                : styles.controls.base(euiTheme)
            }
          >
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem>
                <CopyButton />
              </EuiFlexItem>
              <EuiFlexItem>
                <FullScreenButton />
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        ) : null}
        <ReBroadcastMouseDownEvents>
          {accessibilityOverlayEnabled && isFullScreen && renderPrompt()}
          <MonacoEditor
            theme={theme}
            language={languageId}
            value={value}
            onChange={onChange}
            width={isFullScreen ? '100vw' : width}
            height={isFullScreen ? '100vh' : fitToContent ? undefined : height}
            editorWillMount={_editorWillMount}
            editorDidMount={_editorDidMount}
            editorWillUnmount={_editorWillUnmount}
            overflowWidgetsContainerZIndexOverride={overflowWidgetsContainerZIndexOverride}
            options={{
              padding: allowFullScreen || isCopyable ? { top: 24 } : {},
              renderLineHighlight: 'none',
              scrollBeyondLastLine: false,
              minimap: {
                enabled: false,
              },
              scrollbar: {
                useShadows: false,
                // Scroll events are handled only when there is scrollable content. When there is scrollable content, the
                // editor should scroll to the bottom then break out of that scroll context and continue scrolling on any
                // outer scrollbars.
                alwaysConsumeMouseWheel: false,
              },
              wordBasedSuggestions: false,
              wordWrap: 'on',
              wrappingIndent: 'indent',
              matchBrackets: 'never',
              fontFamily: 'Roboto Mono',
              fontSize: isFullScreen ? 16 : 12,
              lineHeight: isFullScreen ? 24 : 21,
              contextmenu: enableCustomContextMenu,
              // @ts-expect-error, see https://github.com/microsoft/monaco-editor/issues/3829
              'bracketPairColorization.enabled': false,
              ...options,
              // Explicit links prop always takes precedence over any value passed in options
              links,
              // Explicit not possible to override because of the way the suggestion widget is rendered in a separate container
              fixedOverflowWidgets: true,
            }}
          />
        </ReBroadcastMouseDownEvents>
      </FullScreenDisplay>
    </div>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useRef, useCallback, useMemo, useEffect, KeyboardEvent } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import ReactMonacoEditor from 'react-monaco-editor';
import {
  htmlIdGenerator,
  EuiToolTip,
  keys,
  EuiButtonIcon,
  EuiOverlayMask,
  EuiI18n,
  EuiFocusTrap,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  UseEuiTheme,
} from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import './register_languages';
import { remeasureFonts } from './remeasure_fonts';

import { PlaceholderWidget } from './placeholder_widget';
import {
  codeEditorControlsStyles,
  codeEditorFullScreenStyles,
  codeEditorKeyboardHintStyles,
  codeEditorStyles,
} from './editor.styles';

export interface Props {
  /** Width of editor. Defaults to 100%. */
  width?: string | number;

  /** Height of editor. Defaults to 100%. */
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
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.istandaloneeditorconstructionoptions.html
   */
  options?: monaco.editor.IStandaloneEditorConstructionOptions;

  /**
   * Suggestion provider for autocompletion
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.completionitemprovider.html
   */
  suggestionProvider?: monaco.languages.CompletionItemProvider;

  /**
   * Signature provider for function parameter info
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.signaturehelpprovider.html
   */
  signatureProvider?: monaco.languages.SignatureHelpProvider;

  /**
   * Hover provider for hover documentation
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.hoverprovider.html
   */
  hoverProvider?: monaco.languages.HoverProvider;

  /**
   * Language config provider for bracket
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.languageconfiguration.html
   */
  languageConfiguration?: monaco.languages.LanguageConfiguration;

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

  /**
   * Should the editor use the dark theme
   */
  useDarkTheme?: boolean;

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

  isCopyable?: boolean;
  allowFullScreen?: boolean;
}

export const CodeEditor: React.FC<Props> = ({
  languageId,
  value,
  onChange,
  width,
  height,
  options,
  overrideEditorWillMount,
  editorDidMount,
  editorWillMount,
  suggestionProvider,
  signatureProvider,
  hoverProvider,
  placeholder,
  languageConfiguration,
  'aria-label': ariaLabel = i18n.translate('sharedUXPackages.codeEditor.ariaLabel', {
    defaultMessage: 'Code Editor',
  }),
  isCopyable = false,
  allowFullScreen = false,
}) => {
  const { euiTheme } = useEuiTheme();

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

  const _editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const _placeholderWidget = useRef<PlaceholderWidget | null>(null);
  const isSuggestionMenuOpen = useRef(false);
  const editorHint = useRef<HTMLDivElement>(null);
  const textboxMutationObserver = useRef<MutationObserver | null>(null);

  const [isHintActive, setIsHintActive] = useState(true);

  const defaultStyles = codeEditorStyles();
  const hintStyles = codeEditorKeyboardHintStyles(euiTheme.levels);
  const styles = useMemo(() => {
    return !isHintActive ? defaultStyles : { defaultStyles, hintStyles };
  }, [isHintActive, defaultStyles, hintStyles]);

  const _updateDimensions = useCallback(() => {
    _editor.current?.layout();
  }, []);

  useResizeDetector({
    handleWidth: true,
    handleHeight: true,
    onResize: _updateDimensions,
    refreshMode: 'debounce',
  });

  const startEditing = useCallback(() => {
    setIsHintActive(false);
    _editor.current?.focus();
  }, []);

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
    (ev: monaco.IKeyboardEvent) => {
      if (ev.keyCode === monaco.KeyCode.Escape) {
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
  }, [stopEditing]);

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
          css={styles}
          id={htmlIdGenerator('codeEditor')()}
          ref={editorHint}
          tabIndex={0}
          role="button"
          onClick={startEditing}
          onKeyDown={onKeyDownHint}
          aria-label={ariaLabel}
          data-test-subj="codeEditorHint"
        />
      </EuiToolTip>
    );
  }, [onKeyDownHint, startEditing, ariaLabel, isReadOnly, styles]);

  const _editorWillMount = useCallback(
    (__monaco: unknown) => {
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

        if (languageConfiguration) {
          monaco.languages.setLanguageConfiguration(languageId, languageConfiguration);
        }
      });
    },
    [
      overrideEditorWillMount,
      editorWillMount,
      languageId,
      suggestionProvider,
      signatureProvider,
      hoverProvider,
      languageConfiguration,
    ]
  );

  const _editorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, __monaco: unknown) => {
      if (__monaco !== monaco) {
        throw new Error('react-monaco-editor is using a different version of monaco');
      }

      remeasureFonts();

      _editor.current = editor;

      const textbox = editor.getDomNode()?.getElementsByTagName('textarea')[0];
      if (textbox) {
        // Make sure the textarea is not directly accesible with TAB
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

      editor.onKeyDown(onKeydownMonaco);
      editor.onDidBlurEditorText(onBlurMonaco);

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

      editorDidMount?.(editor);
    },
    [editorDidMount, onBlurMonaco, onKeydownMonaco]
  );

  useEffect(() => {
    return () => {
      textboxMutationObserver.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (placeholder && !value && _editor.current) {
      // Mounts editor inside constructor
      _placeholderWidget.current = new PlaceholderWidget(
        placeholder,
        _editor.current,
        euiTheme.colors.subduedText
      );
    }
    return () => {
      _placeholderWidget.current?.dispose();
      _placeholderWidget.current = null;
    };
  }, [placeholder, value, euiTheme]);

  const { CopyButton } = useCopy({ isCopyable, value });

  const controlStyles = useMemo(() => {
    const copyableStyles = [defaultStyles, codeEditorControlsStyles(euiTheme.size, euiTheme.base)];
    return allowFullScreen || isCopyable ? copyableStyles : defaultStyles;
  }, [allowFullScreen, isCopyable, defaultStyles, euiTheme]);

  return (
    <div css={styles} onKeyDown={onKeyDown} style={{ backgroundColor: 'yellowgreen' }}>
      {renderPrompt()}

      <FullScreenDisplay>
        {allowFullScreen || isCopyable ? (
          <div css={controlStyles}>
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
        <MonacoEditor
          // theme={transparentBackground ? 'euiColorsTransparent' : 'euiColors'}
          language={languageId}
          value={value}
          onChange={onChange}
          width={isFullScreen ? '100vw' : width}
          height={isFullScreen ? '100vh' : height}
          editorWillMount={_editorWillMount}
          editorDidMount={_editorDidMount}
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
            ...options,
          }}
        />
      </FullScreenDisplay>
    </div>
  );
};

/**
 * Fullscreen logic
 */

const useFullScreen = ({ allowFullScreen }: { allowFullScreen?: boolean }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (event.key === keys.ESCAPE) {
      event.preventDefault();
      event.stopPropagation();
      setIsFullScreen(false);
    }
  }, []);

  const FullScreenButton: React.FC = () => {
    const { euiTheme } = useEuiTheme();
    const styles = [
      codeEditorStyles,
      codeEditorFullScreenStyles(euiTheme as unknown as UseEuiTheme),
    ];

    if (!allowFullScreen) return null;
    return (
      <EuiI18n
        tokens={['euiCodeBlock.fullscreenCollapse', 'euiCodeBlock.fullscreenExpand']}
        defaults={['Collapse', 'Expand']}
      >
        {([fullscreenCollapse, fullscreenExpand]: string[]) => (
          <EuiButtonIcon
            css={styles}
            onClick={toggleFullScreen}
            iconType={isFullScreen ? 'fullScreenExit' : 'fullScreen'}
            color="text"
            aria-label={isFullScreen ? fullscreenCollapse : fullscreenExpand}
            size="xs"
          />
        )}
      </EuiI18n>
    );
  };

  const FullScreenDisplay = useMemo(
    () =>
      ({ children }: { children: Array<JSX.Element | null> | JSX.Element }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { euiTheme } = useEuiTheme();

        if (!isFullScreen) return <>{children}</>;
        const styles = codeEditorFullScreenStyles(euiTheme as unknown as UseEuiTheme);

        return (
          <EuiOverlayMask>
            <EuiFocusTrap clickOutsideDisables={true}>
              {/* className={'kibanaCodeEditor__isFullScreen'} */}
              <div css={styles}>{children}</div>
            </EuiFocusTrap>
          </EuiOverlayMask>
        );
      },
    [isFullScreen]
  );

  return {
    FullScreenButton,
    FullScreenDisplay,
    onKeyDown,
    isFullScreen,
    setIsFullScreen,
  };
};

const useCopy = ({ isCopyable, value }: { isCopyable: boolean; value: string }) => {
  const showCopyButton = isCopyable && value;

  const CopyButton = () => {
    if (!showCopyButton) return null;
    const styles = codeEditorStyles();

    return (
      <div css={styles}>
        <EuiI18n token="euiCodeBlock.copyButton" default="Copy">
          {(copyButton: string) => (
            <EuiCopy textToCopy={value}>
              {(copy) => (
                <EuiButtonIcon
                  onClick={copy}
                  iconType="copyClipboard"
                  color="text"
                  aria-label={copyButton}
                  size="xs"
                />
              )}
            </EuiCopy>
          )}
        </EuiI18n>
      </div>
    );
  };

  return { showCopyButton, CopyButton };
};

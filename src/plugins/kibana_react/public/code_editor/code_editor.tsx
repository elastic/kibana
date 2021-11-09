/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import ReactResizeDetector from 'react-resize-detector';
import ReactMonacoEditor from 'react-monaco-editor';
import { htmlIdGenerator, EuiToolTip, keys } from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import classNames from 'classnames';
import './register_languages';

import {
  DARK_THEME,
  LIGHT_THEME,
  DARK_THEME_TRANSPARENT,
  LIGHT_THEME_TRANSPARENT,
} from './editor_theme';

import './editor.scss';

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
  /**
   * Accessible name for the editor. (Defaults to "Code editor")
   */
  'aria-label'?: string;
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
  useDarkTheme,
  transparentBackground,
  suggestionProvider,
  signatureProvider,
  hoverProvider,
  languageConfiguration,
  'aria-label': ariaLabel = i18n.translate('kibana-react.kibanaCodeEditor.ariaLabel', {
    defaultMessage: 'Code Editor',
  }),
}) => {
  // We need to be able to mock the MonacoEditor in our test in order to not test implementation
  // detail and not have to call methods on the <CodeEditor /> component instance.
  const MonacoEditor: typeof ReactMonacoEditor = useMemo(() => {
    const isMockedComponent =
      typeof ReactMonacoEditor === 'function' && ReactMonacoEditor.name === 'JestMockEditor';
    return isMockedComponent
      ? (ReactMonacoEditor as unknown as () => typeof ReactMonacoEditor)()
      : ReactMonacoEditor;
  }, []);

  const isReadOnly = options?.readOnly ?? false;

  const _editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const isSuggestionMenuOpen = useRef(false);
  const editorHint = useRef<HTMLDivElement>(null);
  const textboxMutationObserver = useRef<MutationObserver | null>(null);

  const [isHintActive, setIsHintActive] = useState(true);

  /* eslint-disable @typescript-eslint/naming-convention */
  const promptClasses = classNames('kibanaCodeEditor__keyboardHint', {
    'kibanaCodeEditor__keyboardHint--isInactive': !isHintActive,
  });
  /* eslint-enable  @typescript-eslint/naming-convention */

  const _updateDimensions = useCallback(() => {
    _editor.current?.layout();
  }, []);

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
      }
    },
    [stopEditing]
  );

  const onBlurMonaco = useCallback(() => {
    stopEditing();
  }, [stopEditing]);

  const renderPrompt = useCallback(() => {
    const enterKey = (
      <strong>
        {i18n.translate('kibana-react.kibanaCodeEditor.enterKeyLabel', {
          defaultMessage: 'Enter',
          description:
            'The name used for the Enter key on keyword. Will be {key} in kibana-react.kibanaCodeEditor.startEditing(ReadOnly).',
        })}
      </strong>
    );

    const escapeKey = (
      <strong>
        {i18n.translate('kibana-react.kibanaCodeEditor.escapeKeyLabel', {
          defaultMessage: 'Esc',
          description:
            'The label of the Escape key as printed on the keyboard. Will be {key} inside kibana-react.kibanaCodeEditor.stopEditing(ReadOnly).',
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
                  id="kibana-react.kibanaCodeEditor.startEditingReadOnly"
                  defaultMessage="Press {key} to start interacting with the code."
                  values={{ key: enterKey }}
                />
              ) : (
                <FormattedMessage
                  id="kibana-react.kibanaCodeEditor.startEditing"
                  defaultMessage="Press {key} to start editing."
                  values={{ key: enterKey }}
                />
              )}
            </p>
            <p>
              {isReadOnly ? (
                <FormattedMessage
                  id="kibana-react.kibanaCodeEditor.stopEditingReadOnly"
                  defaultMessage="Press {key} to stop interacting with the code."
                  values={{ key: escapeKey }}
                />
              ) : (
                <FormattedMessage
                  id="kibana-react.kibanaCodeEditor.stopEditing"
                  defaultMessage="Press {key} to stop editing."
                  values={{ key: escapeKey }}
                />
              )}
            </p>
          </>
        }
      >
        <div
          className={promptClasses}
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
  }, [onKeyDownHint, promptClasses, startEditing]);

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

      // Register themes
      monaco.editor.defineTheme('euiColors', useDarkTheme ? DARK_THEME : LIGHT_THEME);
      monaco.editor.defineTheme(
        'euiColorsTransparent',
        useDarkTheme ? DARK_THEME_TRANSPARENT : LIGHT_THEME_TRANSPARENT
      );
    },
    [
      overrideEditorWillMount,
      editorWillMount,
      languageId,
      useDarkTheme,
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
    [editorDidMount]
  );

  useEffect(() => {
    return () => {
      textboxMutationObserver.current?.disconnect();
    };
  }, []);

  return (
    <div className="kibanaCodeEditor">
      {renderPrompt()}

      <MonacoEditor
        theme={transparentBackground ? 'euiColorsTransparent' : 'euiColors'}
        language={languageId}
        value={value}
        onChange={onChange}
        width={width}
        height={height}
        editorWillMount={_editorWillMount}
        editorDidMount={_editorDidMount}
        options={{
          renderLineHighlight: 'none',
          scrollBeyondLastLine: false,
          minimap: {
            enabled: false,
          },
          scrollbar: {
            useShadows: false,
          },
          wordBasedSuggestions: false,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          matchBrackets: 'never',
          fontFamily: 'Roboto Mono',
          fontSize: 12,
          lineHeight: 21,
          ...options,
        }}
      />
      <ReactResizeDetector
        handleWidth
        handleHeight
        onResize={_updateDimensions}
        refreshMode="debounce"
      />
    </div>
  );
};

// React.lazy requires default export
// eslint-disable-next-line import/no-default-export
export default CodeEditor;

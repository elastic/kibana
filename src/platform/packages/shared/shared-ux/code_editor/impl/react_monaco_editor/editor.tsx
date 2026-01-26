/* eslint-disable @kbn/eslint/require-license-header */
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
import { defaultThemesResolvers, initializeSupportedLanguages, monaco } from '@kbn/monaco';
import { EuiPortal, type EuiPortalProps, useEuiTheme } from '@elastic/eui';
import * as React from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

if (process.env.NODE_ENV !== 'production') {
  import(
    'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess'
  );
}

export type EditorConstructionOptions = monacoEditor.editor.IStandaloneEditorConstructionOptions;

export type EditorWillMount = (monaco: typeof monacoEditor) => void | EditorConstructionOptions;

export type EditorDidMount = (
  editor: monacoEditor.editor.IStandaloneCodeEditor,
  monaco: typeof monacoEditor
) => void;

export type EditorWillUnmount = (
  editor: monacoEditor.editor.IStandaloneCodeEditor,
  monaco: typeof monacoEditor
) => void | EditorConstructionOptions;

export type ChangeHandler = (
  value: string,
  event: monacoEditor.editor.IModelContentChangedEvent
) => void;

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

// initialize supported languages
initializeSupportedLanguages();

export const OVERFLOW_WIDGETS_TEST_ID = 'kbnCodeEditorEditorOverflowWidgetsContainer';
const OVERFLOW_WIDGETS_CONTAINER_CLASS = 'monaco-editor-overflowing-widgets-container';
// eui flyout z-index is 1000 and highly unlikely to change, so we hardcode values here
// we want to ensure the overflow widgets appear above or below the flyout as needed depending on where the editor is rendered
const OVERFLOW_WIDGETS_Z_INDEX_BELOW_EUI_FLYOUT = 900;
const OVERFLOW_WIDGETS_Z_INDEX_ABOVE_EUI_FLYOUT = 1100;

export function MonacoEditor({
  width = '100%',
  height = '100%',
  value,
  defaultValue = '',
  language = 'javascript',
  theme,
  options,
  editorWillMount,
  editorDidMount,
  editorWillUnmount,
  onChange,
  className,
  overflowWidgetsContainerZIndexOverride,
}: MonacoEditorProps) {
  const containerElement = useRef<HTMLDivElement | null>(null);
  const overflowWidgetsDomNode = useRef<HTMLDivElement | null>(null);

  const euiTheme = useEuiTheme();

  const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const _subscription = useRef<monaco.IDisposable | null>(null);
  const _markersSubscription = useRef<monaco.IDisposable | null>(null);

  const __preventTriggerChangeEvent = useRef<boolean | null>(null);

  const fixedWidth = processSize(width);

  const fixedHeight = processSize(height);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const style = useMemo(
    () => ({
      width: fixedWidth,
      height: fixedHeight,
    }),
    [fixedWidth, fixedHeight]
  );

  const handleEditorWillMount = () => {
    const finalOptions = editorWillMount?.(monaco);
    return finalOptions || {};
  };

  const handleEditorDidMount = () => {
    editorDidMount?.(editor.current!, monaco);

    _subscription.current = editor.current!.onDidChangeModelContent((event) => {
      if (!__preventTriggerChangeEvent.current) {
        onChangeRef.current?.(editor.current!.getValue(), event);
      }
    });
  };

  const handleEditorWillUnmount = () => {
    editorWillUnmount?.(editor.current!, monaco);
  };

  useEffect(() => {
    // register default theme code editor theme
    Object.entries(defaultThemesResolvers).forEach(([themeId, themeResolver]) => {
      monaco.editor.defineTheme(themeId, themeResolver(euiTheme));
    });

    // register theme configurations for supported languages
    monaco.languages.getLanguages().forEach(({ id: languageId }) => {
      let languageThemeResolver;
      if (Boolean((languageThemeResolver = monaco.editor.getLanguageThemeResolver(languageId)))) {
        monaco.editor.defineTheme(languageId, languageThemeResolver!(euiTheme));
      }
    });
  }, [euiTheme]);

  const initMonaco = () => {
    const finalValue = value !== null ? value : defaultValue;

    if (containerElement.current && overflowWidgetsDomNode.current) {
      // add the monaco class name to the overflow widgets dom node so that styles,
      // for it's widgets still apply
      overflowWidgetsDomNode.current?.classList.add('monaco-editor');
      // for applying styles specific to the overflow widgets container
      overflowWidgetsDomNode.current?.classList.add(OVERFLOW_WIDGETS_CONTAINER_CLASS);
      overflowWidgetsDomNode.current?.setAttribute('data-test-subj', OVERFLOW_WIDGETS_TEST_ID);

      // handle special case of editor being rendered inside a container with a high z-index, like an EUI flyout
      // if this is the case by default we will just raise the overflow widgets container z-index above the flyout (1000)
      // more specific edge cases can use the z-index override prop
      const isInsideStackedContainer =
        containerElement.current!.closest('.euiFlyout') !== null || // covers both overlay and push flyouts
        containerElement.current!.closest('[data-euiportal="true"]') !== null; // covers custom portals, like security timeline overlay
      const defaultZIndex = isInsideStackedContainer
        ? OVERFLOW_WIDGETS_Z_INDEX_ABOVE_EUI_FLYOUT
        : OVERFLOW_WIDGETS_Z_INDEX_BELOW_EUI_FLYOUT;

      overflowWidgetsDomNode.current!.style.zIndex = String(
        overflowWidgetsContainerZIndexOverride ?? defaultZIndex
      );

      // Before initializing monaco editor
      const finalOptions = { ...options, ...handleEditorWillMount() };

      const model = monaco.editor.createModel(finalValue!, language);

      editor.current = monaco.editor.create(containerElement.current, {
        model,
        ...(className ? { extraEditorClassName: className } : {}),
        ...finalOptions,
        ...(theme ? { theme } : {}),
        overflowWidgetsDomNode: overflowWidgetsDomNode.current,
      });

      // Ensure we don't leak global marker listeners across mounts/unmounts.
      // Leaked listeners can run after editor disposal and throw, which then gets caught
      // by consumers' error boundaries (e.g. management settings fields).
      _markersSubscription.current?.dispose();
      _markersSubscription.current = monaco.editor.onDidChangeMarkers(() => {
        const currentEditor = editor.current;
        if (!currentEditor) {
          return;
        }

        const currentEditorModel = currentEditor.getModel();
        if (!currentEditorModel || currentEditorModel.isDisposed()) {
          return;
        }

        const markers = monaco.editor.getModelMarkers({
          resource: currentEditorModel.uri,
        });

        const hasErrors = markers.some((m) => m.severity === monaco.MarkerSeverity.Error);

        const $editor = currentEditor.getDomNode();
        if ($editor) {
          const textbox = $editor.querySelector('textarea[aria-roledescription="editor"]');
          textbox?.setAttribute('aria-invalid', hasErrors ? 'true' : 'false');
        }
      });

      // After initializing monaco editor
      handleEditorDidMount();
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(initMonaco, []);

  // useLayoutEffect instead of useEffect to mitigate https://github.com/facebook/react/issues/31023 in React@18 Legacy Mode
  useLayoutEffect(() => {
    if (editor.current) {
      if (value === editor.current.getValue()) {
        return;
      }

      const model = editor.current.getModel();
      __preventTriggerChangeEvent.current = true;
      editor.current.pushUndoStop();
      // pushEditOperations says it expects a cursorComputer, but doesn't seem to need one.
      model!.pushEditOperations(
        [],
        [
          {
            range: model!.getFullModelRange(),
            text: value!,
          },
        ],
        // @ts-expect-error
        undefined
      );
      editor.current.pushUndoStop();
      __preventTriggerChangeEvent.current = false;
    }
  }, [value]);

  useEffect(() => {
    if (editor.current) {
      const model = editor.current.getModel();
      monaco.editor.setModelLanguage(model!, language);
    }
  }, [language]);

  useEffect(() => {
    if (editor.current) {
      // Don't pass in the model on update because monaco crashes if we pass the model
      // a second time. See https://github.com/microsoft/monaco-editor/issues/2027
      // @ts-expect-error
      const { model: _model, ...optionsWithoutModel } = options;
      editor.current.updateOptions({
        ...(className ? { extraEditorClassName: className } : {}),
        ...optionsWithoutModel,
      });
    }
  }, [className, options]);

  useEffect(() => {
    if (editor.current) {
      editor.current.layout();
    }
  }, [width, height]);

  useEffect(() => {
    if (theme) {
      monaco.editor.setTheme(theme);
    }
  }, [theme]);

  useEffect(
    () => () => {
      if (editor.current) {
        handleEditorWillUnmount();
        editor.current.dispose();
        editor.current = null;
      }
      if (_subscription.current) {
        _subscription.current.dispose();
      }
      if (_markersSubscription.current) {
        _markersSubscription.current.dispose();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const setOverflowWidgetsDomNode: NonNullable<EuiPortalProps['portalRef']> = useCallback(
    (node) => {
      overflowWidgetsDomNode.current = node;
    },
    []
  );

  return (
    <>
      <div ref={containerElement} style={style} className="react-monaco-editor-container" />
      {/** @ts-expect-error -- we are using the portal component to render elements produced by monaco here, so no need to provide the expected children prop  */}
      <EuiPortal portalRef={setOverflowWidgetsDomNode} />
    </>
  );
}

MonacoEditor.displayName = 'MonacoEditor';

function processSize(size: number | string) {
  return !/^\d+$/.test(size as string) ? size : `${size}px`;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiDelayRender,
  EuiSkeletonText,
  EuiFormControlLayout,
  EuiErrorBoundary,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CodeEditorProps } from './code_editor';
export type { CodeEditorProps } from './code_editor';
export { monaco, BarePluginApi } from '@kbn/monaco';
export * from './react_monaco_editor/languages/supported';
export {
  // editor themes
  CODE_EDITOR_DEFAULT_THEME_ID,
  CODE_EDITOR_TRANSPARENT_THEME_ID,
  defaultThemesResolvers,
  // language definitions
  XJsonLang,
  PainlessLang,
  SQLLang,
  ESQLLang,
  YamlLang,
  ConsoleLang,
  ConsoleOutputLang,
  MarkdownLang,
  GrokLang,
  HandlebarsLang,
  CssLang,
  HJsonLang,
  PromQLLang,
  // esql
  ESQL_DARK_THEME_ID,
  ESQL_LIGHT_THEME_ID,
  ESQL_AUTOCOMPLETE_TRIGGER_CHARS,
  // console
  CONSOLE_THEME_ID,
  CONSOLE_OUTPUT_THEME_ID,
  getParsedRequestsProvider,
  ConsoleParsedRequestsProvider,
  ConsoleWorkerProxyService,
  createOutputParser,
  // yaml
  configureMonacoYamlSchema,
  // painless
  EditorStateService,
  PainlessCompletionAdapter,
  // lifecycle
  initializeSupportedLanguages,
  // undo/redo
  getUndoRedoService,
} from '@kbn/monaco';
export type {
  // general
  LangModuleType,
  CompleteLangModuleType,
  CustomLangModuleType,
  MonacoEditorError,
  LangValidation,
  SyntaxErrors,
  BaseWorkerDefinition,
  // undo/redo
  UndoRedoService,
  UndoRedoElement,
  // esql
  ESQLDependencies,
  MonacoMessage,
  // console
  ConsoleOutputParser,
  ConsoleParserResult,
  ErrorAnnotation,
  ParsedRequest,
  // painless
  PainlessContext,
  PainlessCompletionKind,
  PainlessCompletionItem,
  PainlessCompletionResult,
  PainlessAutocompleteField,
  EditorState,
  Language,
} from '@kbn/monaco';

const LazyCodeEditorBase = React.lazy(() =>
  import(/* webpackChunkName: "code-editor-entry" */ './code_editor').then((m) => ({
    default: m.CodeEditor,
  }))
);

const Fallback: React.FunctionComponent<{ height: CodeEditorProps['height'] }> = ({ height }) => {
  return (
    <>
      {/* when height is known, set minHeight to avoid layout shift */}
      <div style={{ ...(height ? { minHeight: height } : {}), width: '100%' }}>
        <EuiDelayRender>
          <EuiSkeletonText lines={3} />
        </EuiDelayRender>
      </div>
    </>
  );
};

/**
 * Renders a Monaco code editor with EUI color theme.
 *
 * @see CodeEditorField to render a code editor in the same style as other EUI form fields.
 */
export const CodeEditor: React.FunctionComponent<CodeEditorProps> = (props) => {
  return (
    <EuiErrorBoundary>
      <React.Suspense fallback={<Fallback height={props.height} />}>
        <LazyCodeEditorBase {...props} />
      </React.Suspense>
    </EuiErrorBoundary>
  );
};

/**
 * Renders a Monaco code editor in the same style as other EUI form fields.
 */
export const CodeEditorField: React.FunctionComponent<CodeEditorProps> = (props) => {
  const { width, height, options, fullWidth } = props;
  const { euiTheme } = useEuiTheme();

  const style = {
    width,
    height,
    backgroundColor: options?.readOnly
      ? euiTheme.colors.backgroundBaseDisabled
      : euiTheme.colors.backgroundBaseSubdued,
  };

  return (
    <EuiErrorBoundary>
      <React.Suspense fallback={<Fallback height={props.height} />}>
        <EuiFormControlLayout
          append={<div hidden />}
          style={style}
          css={css({
            '.euiFormControlLayout__append::before': {
              display: 'none',
            },
          })}
          readOnly={options?.readOnly}
          fullWidth={fullWidth}
        >
          <LazyCodeEditorBase {...props} transparentBackground />
        </EuiFormControlLayout>
      </React.Suspense>
    </EuiErrorBoundary>
  );
};

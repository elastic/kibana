import React from 'react';
import type { CodeEditorProps } from './code_editor';
export type { CodeEditorProps } from './code_editor';
export { monaco, BarePluginApi } from '@kbn/monaco';
export * from './react_monaco_editor/languages/supported';
export { CODE_EDITOR_DEFAULT_THEME_ID, CODE_EDITOR_TRANSPARENT_THEME_ID, defaultThemesResolvers, XJsonLang, PainlessLang, SQLLang, ESQLLang, YamlLang, ConsoleLang, ConsoleOutputLang, MarkdownLang, GrokLang, HandlebarsLang, CssLang, HJsonLang, PromQLLang, ESQL_DARK_THEME_ID, ESQL_LIGHT_THEME_ID, ESQL_AUTOCOMPLETE_TRIGGER_CHARS, CONSOLE_THEME_ID, CONSOLE_OUTPUT_THEME_ID, getParsedRequestsProvider, ConsoleParsedRequestsProvider, ConsoleWorkerProxyService, createOutputParser, configureMonacoYamlSchema, EditorStateService, PainlessCompletionAdapter, initializeSupportedLanguages, getUndoRedoService, } from '@kbn/monaco';
export type { LangModuleType, CompleteLangModuleType, CustomLangModuleType, MonacoEditorError, LangValidation, SyntaxErrors, BaseWorkerDefinition, UndoRedoService, UndoRedoElement, ESQLDependencies, MonacoMessage, ConsoleOutputParser, ConsoleParserResult, ErrorAnnotation, ParsedRequest, PainlessContext, PainlessCompletionKind, PainlessCompletionItem, PainlessCompletionResult, PainlessAutocompleteField, EditorState, Language, } from '@kbn/monaco';
/**
 * Renders a Monaco code editor with EUI color theme.
 *
 * @see CodeEditorField to render a code editor in the same style as other EUI form fields.
 */
export declare const CodeEditor: React.FunctionComponent<CodeEditorProps>;
/**
 * Renders a Monaco code editor in the same style as other EUI form fields.
 */
export declare const CodeEditorField: React.FunctionComponent<CodeEditorProps>;

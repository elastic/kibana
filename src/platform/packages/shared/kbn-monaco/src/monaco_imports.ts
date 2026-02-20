/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @kbn/eslint/module_migration */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import 'monaco-editor/esm/vs/base/common/worker/simpleWorker';
import 'monaco-editor/esm/vs/base/browser/defaultWorkerFactory';

import 'monaco-editor/esm/vs/editor/browser/coreCommands.js';
import 'monaco-editor/esm/vs/editor/browser/widget/codeEditorWidget.js';

import 'monaco-editor/esm/vs/editor/contrib/wordOperations/browser/wordOperations.js'; // Needed for word-wise char navigation
import 'monaco-editor/esm/vs/editor/contrib/linesOperations/browser/linesOperations.js'; // Needed for enabling shortcuts of removing/joining/moving lines
import 'monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js'; // Needed for folding
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js'; // Needed for suggestions
import 'monaco-editor/esm/vs/editor/contrib/inlineCompletions/browser/inlineCompletions.contribution.js'; // Needed for inline completions
import 'monaco-editor/esm/vs/editor/contrib/hover/browser/hover.js'; // Needed for hover
import 'monaco-editor/esm/vs/editor/contrib/parameterHints/browser/parameterHints.js'; // Needed for signature
import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching.js'; // Needed for brackets matching highlight
import 'monaco-editor/esm/vs/editor/contrib/links/browser/links.js'; // Needed for clickable links with Cmd/Ctrl+Click

import 'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeAction.js';
import 'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionCommands.js';
import 'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionContributions.js';
// import 'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionKeybindingResolver.js';
import 'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionMenu.js';
import 'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionModel.js';
import 'monaco-editor/esm/vs/editor/contrib/comment/browser/comment.js'; // Needed for CMD+/ comment toggling

import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController'; // Needed for Search bar functionality
import 'monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens.js'; // Needed for inspect tokens functionality
import 'monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu.js'; // Needed for enabling custom Monaco context menu

// Register services required by contributions that may be loaded elsewhere (e.g. editor.all).
// Without these, CodeLensContribution, InlayHintsController, and DropIntoEditorController
// fail with "depends on UNKNOWN service" when StandaloneServices.initialize() already ran.
import 'monaco-editor/esm/vs/editor/contrib/codelens/browser/codeLensCache.js';
import 'monaco-editor/esm/vs/editor/contrib/inlayHints/browser/inlayHintsController.js';
import 'monaco-editor/esm/vs/editor/common/services/treeViewsDndService.js';

import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js'; // Needed for basic javascript support
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution.js'; // Needed for basic xml support
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution'; // Needed for yaml support

// config for supported base languages
export {
  conf as cssConf,
  language as cssLanguage,
} from 'monaco-editor/esm/vs/basic-languages/css/css';
export {
  conf as markdownConf,
  language as markdownLanguage,
} from 'monaco-editor/esm/vs/basic-languages/markdown/markdown';
export {
  conf as yamlConf,
  language as yamlLanguage,
} from 'monaco-editor/esm/vs/basic-languages/yaml/yaml';

import type { CustomLangModuleType } from './types';

const languageThemeResolverDefinitions = new Map<
  string,
  CustomLangModuleType['languageThemeResolver']
>();

declare module 'monaco-editor/esm/vs/editor/editor.api' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace editor {
    // augment monaco editor types
    function registerLanguageThemeResolver(
      langId: string,
      languageThemeResolver: CustomLangModuleType['languageThemeResolver'],
      forceOverride?: boolean
    ): void;
    function getLanguageThemeResolver(
      langId: string
    ): CustomLangModuleType['languageThemeResolver'];
  }
}

// add custom methods to monaco editor
Object.defineProperties(monaco.editor, {
  /**
   * @description Registers language theme definition for a language
   */
  registerLanguageThemeResolver: {
    value: ((langId, languageThemeDefinition, forceOverride) => {
      if (!forceOverride && languageThemeResolverDefinitions.has(langId)) {
        throw new Error(`Language theme resolver for ${langId} is already registered`);
      }
      languageThemeResolverDefinitions.set(langId, languageThemeDefinition);
    }) satisfies typeof monaco.editor.registerLanguageThemeResolver,
    enumerable: true,
    configurable: false,
  },
  /**
   * @description Returns language theme definition for a language
   */
  getLanguageThemeResolver: {
    value: ((langId) =>
      languageThemeResolverDefinitions.get(
        langId
      )) satisfies typeof monaco.editor.getLanguageThemeResolver,
    enumerable: true,
    configurable: false,
  },
});

export { monaco };

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/base/common/worker/simpleWorker';
import 'monaco-editor/esm/vs/base/browser/defaultWorkerFactory';
import 'monaco-editor/esm/vs/editor/browser/coreCommands.js';
import 'monaco-editor/esm/vs/editor/browser/widget/codeEditorWidget.js';
import 'monaco-editor/esm/vs/editor/contrib/wordOperations/browser/wordOperations.js';
import 'monaco-editor/esm/vs/editor/contrib/linesOperations/browser/linesOperations.js';
import 'monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js';
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js';
import 'monaco-editor/esm/vs/editor/contrib/inlineCompletions/browser/inlineCompletions.contribution.js';
import 'monaco-editor/esm/vs/editor/contrib/hover/browser/hover.js';
import 'monaco-editor/esm/vs/editor/contrib/parameterHints/browser/parameterHints.js';
import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching.js';
import 'monaco-editor/esm/vs/editor/contrib/wordHighlighter/browser/wordHighlighter.js';
import 'monaco-editor/esm/vs/editor/contrib/links/browser/links.js';
import 'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeAction.js';
import 'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionCommands.js';
import 'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionContributions.js';
import 'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionMenu.js';
import 'monaco-editor/esm/vs/editor/contrib/codeAction/browser/codeActionModel.js';
import 'monaco-editor/esm/vs/editor/contrib/comment/browser/comment.js';
import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController';
import 'monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens.js';
import 'monaco-editor/esm/vs/editor/contrib/contextmenu/browser/contextmenu.js';
import 'monaco-editor/esm/vs/editor/contrib/codelens/browser/codeLensCache.js';
import 'monaco-editor/esm/vs/editor/contrib/inlayHints/browser/inlayHintsController.js';
import 'monaco-editor/esm/vs/editor/common/services/treeViewsDndService.js';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution';
export { conf as cssConf, language as cssLanguage, } from 'monaco-editor/esm/vs/basic-languages/css/css';
export { conf as markdownConf, language as markdownLanguage, } from 'monaco-editor/esm/vs/basic-languages/markdown/markdown';
export { conf as yamlConf, language as yamlLanguage, } from 'monaco-editor/esm/vs/basic-languages/yaml/yaml';
import type { CustomLangModuleType } from './types';
declare module 'monaco-editor/esm/vs/editor/editor.api' {
    namespace editor {
        function registerLanguageThemeResolver(langId: string, languageThemeResolver: CustomLangModuleType['languageThemeResolver'], forceOverride?: boolean): void;
        function getLanguageThemeResolver(langId: string): CustomLangModuleType['languageThemeResolver'];
    }
}
export { monaco };

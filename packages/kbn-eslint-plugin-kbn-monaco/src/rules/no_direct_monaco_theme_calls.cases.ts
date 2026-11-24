/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const CONSUMER = 'x-pack/platform/plugins/shared/some_plugin/public/some_file.tsx';
const WITH_MONACO = 'import { monaco } from "@kbn/code-editor";\n';

/** Rule test cases, replayed through Oxlint's RuleTester by `__fixtures__/run_rule_tests.mjs`. */
export const noDirectMonacoThemeCallsCases = {
  valid: [
    {
      name: 'other Monaco editor calls are fine',
      code: 'monaco.editor.createModel("", "json");',
      filename: CONSUMER,
    },
    {
      name: 'creating an editor with a theme option is not a theme call',
      code: 'monaco.editor.create(el, { theme: "x" });',
      filename: CONSUMER,
    },
    {
      name: 'a bare setTheme is the name of unrelated services',
      code: 'setTheme(core.theme);',
      filename: CONSUMER,
    },
    {
      name: 'a setTheme on something that is not reached through .editor is not Monaco',
      code: 'themeService.setTheme(theme);',
      filename: CONSUMER,
    },
    {
      name: 'an Ace editor named by its variable is not Monaco',
      code: 'aceEditor.setTheme("ace/theme/monokai");',
      filename: CONSUMER,
    },
    {
      name: 'referencing the method without calling it is not a call',
      code: 'const spy = jest.spyOn(monaco.editor, "defineTheme");',
      filename: CONSUMER,
    },
    {
      name: 'the @kbn/monaco package may define themes',
      code: 'monaco.editor.defineTheme("x", {});',
      filename: 'src/platform/packages/shared/kbn-monaco/src/languages/theming/index.ts',
    },
    {
      name: 'the @kbn/code-editor package may set themes',
      code: 'monaco.editor.setTheme("x");',
      filename:
        'src/platform/packages/shared/shared-ux/code_editor/impl/react_monaco_editor/editor.tsx',
    },

    // a bare `editor` is a common name, so it only counts when it traces back to Monaco
    {
      name: 'an editor from an unrelated call is not Monaco',
      code: 'const { editor } = useEditor();\neditor.setTheme("dark");',
      filename: CONSUMER,
    },
    {
      name: 'an editor created by another library is not Monaco',
      code: 'import ace from "ace-builds";\nconst editor = ace.edit(el);\neditor.setTheme("ace/theme/monokai");',
      filename: CONSUMER,
    },
    {
      name: 'an editor imported from another package is not Monaco',
      code: 'import { editor } from "some-other-lib";\neditor.setTheme("x");',
      filename: CONSUMER,
    },
    {
      name: 'a monaco imported from another package is not Monaco',
      code: 'import { monaco } from "some-other-lib";\nconst { editor } = monaco;\neditor.setTheme("x");',
      filename: CONSUMER,
    },
    {
      name: 'an alias of a property named editor on something else is not Monaco',
      code: 'const editor = this.props.editor;\neditor.setTheme("x");',
      filename: CONSUMER,
    },
    {
      name: 'a value built from a Monaco member that is not the editor namespace is not Monaco',
      code: `${WITH_MONACO}const editor = monaco.createSomething();\neditor.setTheme("x");`,
      filename: CONSUMER,
    },

    // nothing to trace
    {
      name: 'a function parameter cannot be traced',
      code: 'export const f = ({ editor }) => editor.setTheme("x");',
      filename: CONSUMER,
    },
    {
      name: 'an undeclared name cannot be traced',
      code: 'editor.setTheme("x");',
      filename: CONSUMER,
    },
    {
      name: 'a parameter shadows the import, so this monaco is not the one that was imported',
      code: `${WITH_MONACO}export const f = (monaco) => {\n  const { editor } = monaco;\n  editor.setTheme("x");\n};`,
      filename: CONSUMER,
    },
    {
      name: 'a cycle of aliases ends instead of looping',
      code: 'const a = b;\nconst b = a;\na.setTheme("x");',
      filename: CONSUMER,
    },
  ],

  invalid: [
    {
      name: 'defining a theme',
      code: 'monaco.editor.defineTheme("x", {});',
      filename: CONSUMER,
      errors: [{ messageId: 'noDefineTheme' }],
    },
    {
      name: 'setting a theme',
      code: 'monaco.editor.setTheme("x");',
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },

    // whatever the monaco namespace is called, or however it is reached
    {
      name: 'a differently named namespace',
      code: 'BarePluginApi.editor.setTheme("x");',
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },
    {
      name: 'the namespace Monaco exposes on the page',
      code: 'window.MonacoEnvironment.monaco.editor.defineTheme("x", {});',
      filename: CONSUMER,
      errors: [{ messageId: 'noDefineTheme' }],
    },
    {
      name: 'a namespace reached through this',
      code: 'this.monaco.editor.setTheme("x");',
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },

    // optional chaining, computed access and non-null assertions are still calls
    {
      name: 'optional chaining',
      code: 'monaco?.editor?.setTheme("x");',
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },
    {
      name: 'computed access to the method',
      code: 'monaco.editor["defineTheme"]("x", {});',
      filename: CONSUMER,
      errors: [{ messageId: 'noDefineTheme' }],
    },
    {
      name: 'a non-null assertion on the editor namespace',
      code: 'monaco.editor!.setTheme("x");',
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },

    // only the packages that own the boundary are exempt
    {
      name: 'tests are not exempt outside of the owning packages',
      code: 'monaco.editor.setTheme("x");',
      filename: 'x-pack/platform/plugins/shared/some_plugin/public/some_file.test.tsx',
      errors: [{ messageId: 'noSetTheme' }],
    },
    {
      name: 'a code_editor directory outside of impl is not the @kbn/code-editor package',
      code: 'monaco.editor.setTheme("x");',
      filename: 'x-pack/platform/plugins/shared/code_editor_thing/public/some_file.tsx',
      errors: [{ messageId: 'noSetTheme' }],
    },
    {
      name: 'two calls, two reports',
      code: 'monaco.editor.defineTheme("x", {});\nmonaco.editor.setTheme("x");',
      filename: CONSUMER,
      errors: [{ messageId: 'noDefineTheme' }, { messageId: 'noSetTheme' }],
    },

    // an `editor` taken out of Monaco is still Monaco's editor
    {
      name: 'destructured from monaco',
      code: `${WITH_MONACO}const { editor } = monaco;\neditor.setTheme("x");`,
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },
    {
      name: 'destructured and renamed',
      code: `${WITH_MONACO}const { editor: monacoEditor } = monaco;\nmonacoEditor.defineTheme("x", {});`,
      filename: CONSUMER,
      errors: [{ messageId: 'noDefineTheme' }],
    },
    {
      name: 'assigned from monaco.editor',
      code: `${WITH_MONACO}const editor = monaco.editor;\neditor.setTheme("x");`,
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },
    {
      name: 'taken from an alias of monaco',
      code: `${WITH_MONACO}const m = monaco;\nconst { editor } = m;\neditor.setTheme("x");`,
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },
    {
      name: 'an alias with a non-null assertion',
      code: `${WITH_MONACO}const { editor } = monaco;\neditor!.setTheme("x");`,
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },
    {
      name: 'used in a scope other than the one that declared it',
      code: `${WITH_MONACO}const { editor } = monaco;\nexport const f = () => {\n  editor.setTheme("x");\n};`,
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },

    // from any of the specifiers that hand out Monaco
    {
      name: 'a monaco imported from @kbn/monaco',
      code: 'import { monaco } from "@kbn/monaco";\nconst { editor } = monaco;\neditor.setTheme("x");',
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },
    {
      name: 'a namespace import of the raw monaco-editor package',
      code: 'import * as monaco from "monaco-editor/editor/editor.api.js";\nconst { editor } = monaco;\neditor.defineTheme("x", {});',
      filename: CONSUMER,
      errors: [{ messageId: 'noDefineTheme' }],
    },
    {
      name: 'an editor imported from the raw monaco-editor package',
      code: 'import { editor } from "monaco-editor/editor/editor.api.js";\neditor.setTheme("x");',
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },
    {
      name: 'an editor imported under another name',
      code: 'import { editor as monacoEditor } from "monaco-editor";\nmonacoEditor.setTheme("x");',
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },

    // or from the namespace Monaco exposes on the page
    {
      name: 'destructured from the namespace on the page',
      code: 'const { editor } = window.MonacoEnvironment.monaco;\neditor.setTheme("x");',
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },
    {
      name: 'monaco destructured from the environment, then editor from monaco',
      code: 'const { monaco } = window.MonacoEnvironment;\nconst { editor } = monaco;\neditor.setTheme("x");',
      filename: CONSUMER,
      errors: [{ messageId: 'noSetTheme' }],
    },
  ],
};

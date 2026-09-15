/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from './monaco_imports';
import type { CustomLangModuleType } from './types';
import { getWorker } from './languages/worker_factory';

declare module 'monaco-editor/esm/vs/editor/editor.api' {
  export interface Environment {
    // add typing for exposing monaco on the MonacoEnvironment property
    monaco: typeof monaco;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace -- augment monaco editor types
  export namespace editor {
    // Define overloads for the getContribution method to allow for better typing of the editor contributions
    interface ICodeEditor {
      getContribution(id: 'editor.contrib.suggestController'):
        | (editor.IEditorContribution & {
            // add type augmentation for the suggestController contribution for the widget property
            widget?: {
              value?: {
                // these methods are not documented in monaco but are available on the vscode upstream,
                // see https://github.com/microsoft/vscode/blob/main/src/vs/editor/contrib/suggest/browser/suggestWidget.ts#L146-L147
                onDidHide?: (cb: () => void) => void;
                onDidShow?: (cb: () => void) => void;
              };
            };
          })
        | null;
      getContribution(id: 'editor.contrib.messageController'):
        | (editor.IEditorContribution & {
            // add type augmentation for the messageController contribution for the showMessage property,
            // which is not documented in monaco but is available on the vscode upstream,
            // see https://github.com/microsoft/vscode/blob/main/src/vs/editor/contrib/message/browser/messageController.ts#L62
            showMessage?: (message: string, position: monaco.Position | null) => void;
          })
        | undefined;
    }

    /**
     * @description Registers language theme definition for a language
     */
    function registerLanguageThemeResolver(
      langId: string,
      languageThemeResolver: CustomLangModuleType['languageThemeResolver'],
      forceOverride?: boolean
    ): void;
    /**
     * @description Returns the registered language theme definition for the provided id
     */
    function getLanguageThemeResolver(
      langId: string
    ): CustomLangModuleType['languageThemeResolver'];
  }
}

window.MonacoEnvironment = {
  // passed for use in functional and unit tests so that we can verify values from 'editor'
  monaco,
  getWorker: (_moduleId, languageId) => {
    return getWorker(languageId);
  },
};

const languageThemeResolverDefinitions = new Map<
  string,
  CustomLangModuleType['languageThemeResolver']
>();

// add custom methods to monaco editor
Object.defineProperties(monaco.editor, {
  /**
   * @description Registration for implementation of {@link monaco.editor.registerLanguageThemeResolver}
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
   * @description Registration for implementation of {@link monaco.editor.getLanguageThemeResolver}
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

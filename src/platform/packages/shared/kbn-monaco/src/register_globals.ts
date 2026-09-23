/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line @kbn/eslint/module_migration
import { createWebWorker } from 'monaco-editor/internal/common/workers.js';
import { monaco } from './monaco_imports';
import type { CustomLangModuleType } from './types';
import { getWorker } from './languages/worker_factory';

declare module 'monaco-editor/editor/editor.api' {
  export interface Environment {
    // add typing for exposing monaco on the MonacoEnvironment property
    // passed for use in functional and unit tests so that we can verify values from 'editor'
    monaco: typeof monaco;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace -- augment monaco editor types
  export namespace editor {
    // Define overloads for the getContribution method to allow for
    // better typing of the editor contributions of concerns to us
    export interface ICodeEditor {
      getContribution(id: 'editor.contrib.suggestController'):
        | (editor.IEditorContribution & {
            // add type augmentation for the suggestController contribution for the widget property
            widget?: {
              value?: {
                // these methods are not documented in monaco but are available on the vscode upstream,
                // see https://github.com/microsoft/vscode/blob/main/src/vs/editor/contrib/suggest/browser/suggestWidget.ts#L149-L150
                onDidHide?: monaco.Emitter<void>['event'];
                onDidShow?: monaco.Emitter<void>['event'];
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
      getContribution(id: 'editor.contrib.contentHover'):
        | (editor.IEditorContribution & {
            // add type augmentations for methods on the contentHover contribution,
            // which is not documented in monaco but is available on the vscode upstream,
            // see https://github.com/microsoft/vscode/blob/main/src/vs/editor/contrib/hover/browser/contentHoverController.ts#L41C64-L46
            shouldKeepOpenOnEditorMouseMoveOrLeave: boolean;
            hideContentHover: () => void;
            readonly _onHoverContentsChanged?: monaco.Emitter<void>;
            readonly isHoverVisible: boolean | undefined;
            readonly _contentWidget?: {
              getDomNode: () => HTMLElement;
            };
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
  monaco,
  getWorker: (_moduleId, languageId) => {
    return getWorker(languageId);
  },
} satisfies typeof MonacoEnvironment;

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

// In Monaco version >= 0.54, the createWebWorker function signature changed to accept `{ worker: Worker|Promise<Worker> }`
// instead of the previous `{ moduleId, label, createData }`, monaco-yaml (via monaco-worker-manager@2) still
// uses the old signature.
// This shim intercepts old-style calls, manually creates the Worker, sends
// the two initialization messages monaco-worker-manager requires before Monaco's own INITIALIZE handshake,
// then forwards to the real createWebWorker with the new API.
//
// This is not a novel implementation a variant of it is present in monaco 0.54,
// see https://github.com/microsoft/monaco-editor/blob/v0.54.0/src/editor/editor.main.ts#L10-L16.
{
  // Monaco version >= 0.54 dropped exposing IWebWorkerOptions from its public types.
  interface LegacyWebWorkerOptions {
    moduleId: string;
    label?: string;
    createData?: object;
    host?: monaco.editor.IInternalWebWorkerOptions['host'];
    keepIdleModels?: boolean;
  }

  type CreateWebWorkerOptions = monaco.editor.IInternalWebWorkerOptions | LegacyWebWorkerOptions;

  const isLegacyWebWorkerOptions = (opts: CreateWebWorkerOptions): opts is LegacyWebWorkerOptions =>
    'moduleId' in opts && !('worker' in opts);

  const originalCreateWebWorker = monaco.editor.createWebWorker;

  monaco.editor.createWebWorker = function <T extends object>(
    opts: CreateWebWorkerOptions
  ): monaco.editor.MonacoWebWorker<T> {
    if (isLegacyWebWorkerOptions(opts)) {
      return createWebWorker(opts);
    }

    return originalCreateWebWorker(opts);
  };
}

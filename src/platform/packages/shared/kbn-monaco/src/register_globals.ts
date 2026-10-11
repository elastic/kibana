/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from './monaco_imports';
import { getWorker } from './languages/worker_factory';
import type { KbnMonacoTheming } from './languages/theming';

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
              // The states Monaco's own `_shouldKeepCurrentHover` refuses to dismiss on,
              // see https://github.com/microsoft/vscode/blob/main/src/vs/editor/contrib/hover/browser/contentHoverController.ts#L149-L151
              readonly isFocused?: boolean;
              readonly isResizing?: boolean;
              readonly isVisibleFromKeyboard?: boolean;
            };
          })
        | undefined;
      getContribution(id: 'editor.contrib.inspectTokens'):
        | (editor.IEditorContribution & {
            // add type augmentation for the inspectTokens contribution for the _widget property,
            // which is not documented in monaco but is available on the vscode upstream,
            // see https://github.com/microsoft/vscode/blob/d52f2195fba39dbf8eeed219d735f11b8b49a057/src/vs/editor/standalone/browser/inspectTokens/inspectTokens.ts#L35
            _widget: {
              getDomNode: () => HTMLElement;
            } | null;
          })
        | undefined;
    }

    /**
     * @description Registers a theme resolver definition for a language
     */
    const registerLanguageThemeResolver: KbnMonacoTheming['registerLanguageThemeResolver'];
    /**
     * @description Returns the resolved registered language theme definition for the provided id
     */
    const getLanguageThemeResolver: KbnMonacoTheming['getLanguageThemeResolver'];
  }
}

window.MonacoEnvironment = {
  monaco,
  getWorker: (_moduleId, languageId) => {
    return getWorker(languageId);
  },
} satisfies typeof MonacoEnvironment;

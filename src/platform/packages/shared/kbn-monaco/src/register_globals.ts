/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { YAML_LANG_ID } from './languages';
import { monaco } from './monaco_imports';
import { getWorker, getWorkerUrl } from './worker_factory';

declare module 'monaco-editor/esm/vs/editor/editor.api' {
  export interface Environment {
    // add typing for exposing monaco on the MonacoEnvironment property
    monaco: typeof monaco;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace -- augment monaco editor types for better editor contribution typing
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
            // add type augmentation for the messageController contribution for the showMessage property, which is not documented in monaco but is available on the vscode upstream,
            // see https://github.com/microsoft/vscode/blob/main/src/vs/editor/contrib/message/browser/messageController.ts#L62
            showMessage?: (message: string, position: monaco.Position | null) => void;
          })
        | undefined;
    }
  }
}

window.MonacoEnvironment = {
  // passed for use in functional and unit tests so that we can verify values from 'editor'
  monaco,
  getWorkerUrl: (_: string, languageId: string) => getWorkerUrl(languageId),
};

// Monaco 0.54 changed createWebWorker to accept `{ worker: Worker|Promise<Worker> }` instead of
// the previous `{ moduleId, label, createData }`. monaco-yaml (via monaco-worker-manager@2) still
// uses the old signature. This shim intercepts old-style calls, manually creates the Worker, sends
// the two initialization messages monaco-worker-manager requires before Monaco's own INITIALIZE
// handshake, then forwards to the real createWebWorker with the new API.
//
// TODO: remove this shim once monaco-yaml (currently 5.4.0) / monaco-worker-manager (currently
// 2.0.1, unmaintained as of 2022) is updated to pass a `worker` factory directly and no longer
// calls createWebWorker with the old `{ moduleId }` shape. No upstream tracking issue exists yet;
// check both repos when upgrading monaco-yaml.
{
  // Monaco's editor.api.d.ts merges two `editor` namespaces so `createWebWorker` is typed only as
  // the legacy `{ moduleId }` overload; the runtime accepts `IInternalWebWorkerOptions` as well.
  const originalCreateWebWorker = monaco.editor.createWebWorker as <T extends object>(
    opts: monaco.editor.IInternalWebWorkerOptions | monaco.editor.IWebWorkerOptions
  ) => monaco.editor.MonacoWebWorker<T>;
  monaco.editor.createWebWorker = function (opts: any) {
    // Only shim the old `{ moduleId }` signature used by monaco-yaml via monaco-worker-manager.
    // Kibana's own workers (painless, xjson, console) bypass this path entirely by passing { worker }.
    if (opts?.moduleId && !opts?.worker && opts?.label === YAML_LANG_ID) {
      const label: string = opts.label;
      const url: string = getWorkerUrl(label);
      if (url) {
        const worker = getWorker(label);
        worker.postMessage({}); // trigger: installs monaco-worker-manager's onmessage handler
        worker.postMessage(opts.createData ?? {}); // createData payload for the language service factory
        return originalCreateWebWorker.call(this, {
          worker,
          host: opts.host,
          keepIdleModels: opts.keepIdleModels,
        });
      }
    }
    return originalCreateWebWorker.call(this, opts);
  };
}

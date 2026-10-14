/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MonacoYaml } from 'monaco-yaml';
import { type MonacoYamlOptions } from 'monaco-yaml';
import { monaco } from '../../../monaco_imports';
import type { LangModuleType } from '../../../types';
import { languageConfiguration, lexerRules } from './language';
import { ID } from './constants';
import { getWorker } from '../../worker_factory';

declare module 'monaco-types' {
  // IDisposable gets broken within the monaco-types which is a transitive dependency of monaco-yaml
  export type IDisposable = monaco.IDisposable;
}

// Roll our own definition because Monaco version >= 0.54
// doesn't expose IWebWorkerOptions from its public types.
export interface LegacyWebWorkerOptions {
  moduleId: string;
  label?: string;
  createData?: object;
  host?: monaco.editor.IInternalWebWorkerOptions['host'];
  keepIdleModels?: boolean;
}

export type CreateWebWorkerOptions =
  | monaco.editor.IInternalWebWorkerOptions
  | LegacyWebWorkerOptions;

const isLegacyWebWorkerOptions = (opts: CreateWebWorkerOptions): opts is LegacyWebWorkerOptions =>
  'moduleId' in opts && !('worker' in opts);

export { ID as YAML_LANG_ID, type MonacoYaml, type MonacoYamlOptions };

export const YamlLang: LangModuleType = { ID, languageConfiguration, lexerRules };

const monacoYamlDefaultOptions: MonacoYamlOptions = {
  completion: true,
  hover: true,
  validate: true,
};

// In Monaco version >= 0.54, the createWebWorker function signature changed to accept `{ worker: Worker|Promise<Worker> }`
// instead of the previous `{ moduleId, label, createData }`, monaco-yaml (via monaco-worker-manager@2) still
// uses the old signature.
// This shim intercepts old-style calls, manually creates the Worker, sends
// the two initialization messages monaco-worker-manager requires before Monaco's own INITIALIZE handshake,
// then forwards to the real createWebWorker with the new API.
const monacoApiForYaml = new Proxy(monaco, {
  get(target, property, receiver) {
    if (property === 'editor') {
      return new Proxy(target[property], {
        get(editorTarget, editorProperty, editorReceiver) {
          if (editorProperty === 'createWebWorker') {
            return (options: CreateWebWorkerOptions) => {
              // Modern calls pass through unchanged.
              if (!isLegacyWebWorkerOptions(options)) {
                return Reflect.apply(editorTarget[editorProperty], editorTarget, [options]);
              }

              // for legacy web worker options, create a worker and perform the initialization handshake
              const worker = Promise.resolve(getWorker(options.label ?? ID)).then((w) => {
                w.postMessage('ignore');
                w.postMessage(options.createData);
                return w;
              });

              return Reflect.apply(editorTarget[editorProperty], editorTarget, [
                { worker, host: options.host, keepIdleModels: options.keepIdleModels },
              ]);
            };
          }

          return Reflect.get(editorTarget, editorProperty, editorReceiver);
        },
      });
    }

    return Reflect.get(target, property, receiver);
  },
});

export const configureMonacoYamlSchema = async (
  schemas: MonacoYamlOptions['schemas'],
  options?: Omit<Partial<MonacoYamlOptions>, 'schemas'>
) => {
  const { configureMonacoYaml } = await import(/* webpackChunkName: "monaco-yaml" */ 'monaco-yaml');

  const finalOptions: MonacoYamlOptions = {
    ...monacoYamlDefaultOptions,
    ...(options || {}),
    schemas,
  };

  return configureMonacoYaml(monacoApiForYaml, finalOptions);
};

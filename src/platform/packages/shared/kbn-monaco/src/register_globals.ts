/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  XJsonLang,
  PainlessLang,
  ESQLLang,
  ConsoleLang,
  ConsoleOutputLang,
  YamlLang,
} from './languages';
import { monaco } from './monaco_imports';

export const DEFAULT_WORKER_ID = 'default';

const langSpecificWorkerIds = [
  XJsonLang.ID,
  PainlessLang.ID,
  ESQLLang.ID,
  monaco.languages.json.jsonDefaults.languageId,
  YamlLang.ID,
  ConsoleLang.ID,
  ConsoleOutputLang.ID,
];

declare module 'monaco-editor/esm/vs/editor/editor.api' {
  export interface Environment {
    // add typing for exposing monaco on the MonacoEnvironment property
    monaco: typeof monaco;
  }
}

const monacoBundleDir = (window as any).__kbnPublicPath__?.['kbn-monaco'];

window.MonacoEnvironment = {
  // passed for use in functional and unit tests so that we can verify values from 'editor'
  monaco,
  getWorkerUrl: monacoBundleDir
    ? (_: string, languageId: string) => {
        const workerId = langSpecificWorkerIds.includes(languageId)
          ? languageId
          : DEFAULT_WORKER_ID;
        return `${monacoBundleDir}${workerId}.editor.worker.js`;
      }
    : () => '',
};

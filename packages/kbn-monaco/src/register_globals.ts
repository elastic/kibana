/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { XJsonLang } from './xjson';
import { PainlessLang } from './painless';
import { SQLLang } from './sql';
import { monaco } from './monaco_imports';
import { ESQL_THEME_ID, ESQLLang, buildESQlTheme } from './esql';
import { registerLanguage, registerTheme } from './helpers';
import { createWorkersRegistry } from './workers_registry';

export const DEFAULT_WORKER_ID = 'default';

const Yaml = 'yaml';

const workerRegistry = createWorkersRegistry(DEFAULT_WORKER_ID);

workerRegistry.register(
  DEFAULT_WORKER_ID,
  async () => await import('!!raw-loader!../../target_workers/default.editor.worker.js')
);

workerRegistry.register(
  XJsonLang.ID,
  async () => await import('!!raw-loader!../../target_workers/xjson.editor.worker.js')
);

workerRegistry.register(
  PainlessLang.ID,
  async () => await import('!!raw-loader!../../target_workers/painless.editor.worker.js')
);

workerRegistry.register(
  ESQLLang.ID,
  async () => await import('!!raw-loader!../../target_workers/esql.editor.worker.js')
);

workerRegistry.register(
  monaco.languages.json.jsonDefaults.languageId,
  async () => await import('!!raw-loader!../../target_workers/json.editor.worker.js')
);

workerRegistry.register(
  Yaml,
  async () => await import('!!raw-loader!../../target_workers/yaml.editor.worker.js')
);

/**
 * Register languages and lexer rules
 */
registerLanguage(XJsonLang);
registerLanguage(PainlessLang);
registerLanguage(SQLLang);
registerLanguage(ESQLLang);

/**
 * Register custom themes
 */
registerTheme(ESQL_THEME_ID, buildESQlTheme());

// @ts-ignore
window.MonacoEnvironment = {
  // needed for functional tests so that we can get value from 'editor'
  monaco,
  getWorker: workerRegistry.getWorker,
};

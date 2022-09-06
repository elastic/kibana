/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// global setup for supported languages
import './src/register_globals';

export { monaco } from './src/monaco_imports';
export { XJsonLang } from './src/xjson';
export { EsqlLang } from './src/esql';
export * from './src/painless';
/* eslint-disable-next-line @kbn/eslint/module_migration */
import * as BarePluginApi from 'monaco-editor/esm/vs/editor/editor.api';

import { registerLanguage } from './src/helpers';

export { BarePluginApi, registerLanguage };
export * from './src/types';

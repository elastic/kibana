/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable @kbn/eslint/module_migration */
import { monaco } from '@kbn/monaco';
import { language, conf } from 'monaco-editor/esm/vs/basic-languages/css/css';
import { LANG } from './constants';

monaco.languages.register({
  id: LANG,
});
monaco.languages.setMonarchTokensProvider(LANG, language);
monaco.languages.setLanguageConfiguration(LANG, conf);

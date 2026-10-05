/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { monaco } from './monaco_imports';
import { CONSOLE_LANG_ID, PAINLESS_LANG_ID, XJSON_LANG_ID, YAML_LANG_ID } from './languages';
import {
  DEFAULT_WORKER_ID,
  LANG_SPECIFIC_WORKER_IDS,
  MONACO_WORKER_ENTRIES,
} from './worker_entries';

describe('MONACO_WORKER_ENTRIES', () => {
  it('matches the language ids that request a dedicated worker', () => {
    expect(LANG_SPECIFIC_WORKER_IDS).toEqual([
      monaco.languages.json.jsonDefaults.languageId,
      XJSON_LANG_ID,
      PAINLESS_LANG_ID,
      YAML_LANG_ID,
      CONSOLE_LANG_ID,
    ]);
  });

  it('has an entry for the default worker and each language worker', () => {
    expect(Object.keys(MONACO_WORKER_ENTRIES)).toEqual([
      DEFAULT_WORKER_ID,
      ...LANG_SPECIFIC_WORKER_IDS,
    ]);
  });

  it('points package workers at files that exist', () => {
    for (const entry of Object.values(MONACO_WORKER_ENTRIES)) {
      if (!entry.startsWith('src/')) continue;
      expect(Fs.existsSync(Path.resolve(__dirname, '..', entry))).toBe(true);
    }
  });
});

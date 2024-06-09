/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TranslationInput } from '@kbn/i18n';
import { readFile as readFileAsync } from 'fs/promises';

export async function parseTranslationFile(translationFile: string): Promise<TranslationInput> {
  const fileString = await readFileAsync(translationFile, 'utf-8');
  const translationInput: TranslationInput = JSON.parse(fileString);

  return translationInput;
}

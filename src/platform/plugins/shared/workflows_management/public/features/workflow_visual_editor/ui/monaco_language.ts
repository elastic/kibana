/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_LANG_ID, XJSON_LANG_ID } from '@kbn/monaco';
import { ensureJsonLiquidLanguage, JSON_LIQUID_LANG_ID } from './json_liquid_language';
import type { StepFieldLanguage } from '../lib/step_form_schema';

/** Monaco language for a code field. There is no KQL Monaco mode, so conditions use plaintext. */
export const monacoLanguageFor = (language: StepFieldLanguage | undefined): string => {
  switch (language) {
    case 'json':
      return XJSON_LANG_ID;
    case 'esql':
      return ESQL_LANG_ID;
    case 'json-liquid':
      ensureJsonLiquidLanguage();
      return JSON_LIQUID_LANG_ID;
    default:
      return 'plaintext';
  }
};

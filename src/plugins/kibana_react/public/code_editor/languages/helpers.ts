/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { monaco } from '@kbn/monaco';
import { mergeWith, isArray, isEmpty } from 'lodash';
import { LangModuleType } from './';

function registerLanguage(language: LangModuleType) {
  monaco.languages.register({ id: language.ID });
  monaco.languages.setMonarchTokensProvider(language.ID, language.language);
  monaco.languages.setLanguageConfiguration(language.ID, language.conf);
}

function mergeConfig<T>(firstConfig: T, secondConfig: T) {
  return mergeWith(firstConfig, secondConfig, (src, dst) => {
    if (isArray(src) && isArray(dst)) return [...src, ...dst];
    if (isEmpty(src)) return dst;
    if (isEmpty(dst)) return src;
  });
}

export { registerLanguage, mergeConfig };

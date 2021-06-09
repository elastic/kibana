/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import { HttpStart, NotificationsStart } from 'src/core/public';

export function getSupportedScriptingLanguages(): estypes.ScriptLanguage[] {
  return ['painless'];
}

export function getDeprecatedScriptingLanguages(): estypes.ScriptLanguage[] {
  return [];
}

export const getEnabledScriptingLanguages = (
  http: HttpStart,
  toasts: NotificationsStart['toasts']
) =>
  http.get('/api/kibana/scripts/languages').catch(() => {
    toasts.addDanger(
      i18n.translate('indexPatternManagement.scriptingLanguages.errorFetchingToastDescription', {
        defaultMessage: 'Error getting available scripting languages from Elasticsearch',
      })
    );

    return [];
  });

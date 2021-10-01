/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { DeprecationsDetails } from '../../deprecations';
import { IScopedClusterClient } from '../../elasticsearch';
import { isInlineScriptingDisabled } from './is_scripting_disabled';

interface GetScriptingDisabledDeprecations {
  esClient: IScopedClusterClient;
}

export const getScriptingDisabledDeprecations = async ({
  esClient,
}: GetScriptingDisabledDeprecations): Promise<DeprecationsDetails[]> => {
  const deprecations: DeprecationsDetails[] = [];
  if (await isInlineScriptingDisabled({ client: esClient.asInternalUser })) {
    deprecations.push({
      title: i18n.translate('core.elasticsearch.deprecations.scriptingDisabled.title', {
        defaultMessage: 'Inline scripting is disabled on elasticsearch',
      }),
      message: i18n.translate('core.elasticsearch.deprecations.scriptingDisabled.message', {
        defaultMessage:
          'Starting in 8.0, Kibana will require inline scripting to be enabled,' +
          'and will fail to start otherwise.',
      }),
      level: 'critical',
      requireRestart: false,
      correctiveActions: {
        manualSteps: [
          i18n.translate('core.elasticsearch.deprecations.scriptingDisabled.manualSteps.1', {
            defaultMessage: 'Set `script.allowed_types=inline` in your elasticsearch config ',
          }),
        ],
      },
    });
  }
  return deprecations;
};

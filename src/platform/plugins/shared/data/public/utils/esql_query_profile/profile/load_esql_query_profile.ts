/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { ESQLSearchParams } from '@kbn/es-types';
import type { IEsqlSearchParams } from '@kbn/search-types';
import type { ISearchStart } from '../../../search';
import { summarizeResults } from './result_summary';
import { aggregateEsqlProfile } from './aggregate_esql_profile';
import type { QueryProfileView } from './types';
import { isRecord } from '../shared/json_helpers';

/** Re-runs a logged ES|QL request with `profile: true` and returns the view model. */
export async function loadEsqlQueryProfile({
  search,
  requestJson,
  abortSignal,
  keepResults,
}: {
  search: Pick<ISearchStart, 'esql'>;
  requestJson: object;
  abortSignal: AbortSignal;
  /**
   * Asked when the response arrives, and when it says yes the view can summarize the results. The
   * rows are held for that, so a profile that has no use for them should say no.
   */
  keepResults: () => boolean;
}): Promise<QueryProfileView> {
  if (!isRecord(requestJson) || typeof requestJson.query !== 'string') {
    throw new Error(
      i18n.translate('data.inspector.queryProfile.missingQueryErrorMessage', {
        defaultMessage: 'This request does not include an ES|QL query.',
      })
    );
  }

  const settings = isRecord(requestJson.settings) ? requestJson.settings : undefined;
  const { rawResponse } = await search.esql(
    {
      query: requestJson.query,
      ...(Array.isArray(requestJson.params)
        ? { params: requestJson.params as ESQLSearchParams['params'] }
        : {}),
      ...(isRecord(requestJson.filter) || Array.isArray(requestJson.filter)
        ? { filter: requestJson.filter as IEsqlSearchParams['filter'] }
        : {}),
      ...(typeof requestJson.time_zone === 'string' ? { timeZone: requestJson.time_zone } : {}),
      ...(typeof requestJson.locale === 'string' ? { locale: requestJson.locale } : {}),
      ...(typeof requestJson.dropNullColumns === 'boolean'
        ? { dropNullColumns: requestJson.dropNullColumns }
        : {}),
      profile: true,
      includeExecutionMetadata: requestJson.include_execution_metadata === true,
      columnMetadata: settings?.column_metadata === true,
      ...(typeof requestJson.approximation === 'boolean'
        ? { approximation: requestJson.approximation }
        : {}),
      ...(typeof requestJson.project_routing === 'string'
        ? { projectRouting: requestJson.project_routing }
        : {}),
    },
    { abortSignal }
  );

  const profile = 'profile' in rawResponse ? rawResponse.profile : undefined;
  if (profile == null) {
    throw new Error(
      i18n.translate('data.inspector.queryProfile.missingProfileErrorMessage', {
        defaultMessage: 'This response did not include a query profile.',
      })
    );
  }

  const view = aggregateEsqlProfile(profile);
  if (!keepResults()) {
    return view;
  }
  // Only the rows are held, not the rest of the response, and they are summarized when asked for.
  const { columns, values } = rawResponse;
  return { ...view, readResults: once(() => summarizeResults({ columns, values })) };
}

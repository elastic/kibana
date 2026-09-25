/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

import { schema } from '@kbn/config-schema';
import type { CoreSetup } from '@kbn/core/server';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { getKbnServerError, reportServerError } from '@kbn/kibana-utils-plugin/server';
import type { PluginSetup as KqlPluginSetup } from '@kbn/kql/server';

import type { StartDeps } from '../plugin';

import { getESQLSingleColumnValues } from '../../common/options_list/get_esql_single_column_values';
import type {
  OptionsListESQLFetchBody,
  OptionsListResponse,
} from '../../common/options_list/types';
import { getOptionsListDslSuggestions } from './get_options_list_dsl_suggestions';
import {
  optionsListDslFetchBodySchema,
  optionsListEsqlFetchBodySchema,
} from './options_list_fetch_body_schema';
import { esqlColumnValuesToOptionsListResponse } from './options_list_esql_response';

export const setupOptionsListSuggestionsRoute = (
  core: CoreSetup<StartDeps>,
  getAutocompleteSettings: KqlPluginSetup['autocomplete']['getAutocompleteSettings']
) => {
  const router = core.http.createRouter();

  router.versioned
    .post({
      access: 'internal',
      path: '/internal/controls/optionsList/fetch',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because permissions will be checked by elasticsearch.',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.oneOf([optionsListDslFetchBodySchema, optionsListEsqlFetchBodySchema]),
          },
        },
      },
      async (context, request, response) => {
        try {
          const [, { data }] = await core.getStartServices();
          const { elasticsearch, uiSettings } = await context.core;

          const suggestionsResponse =
            request.body.kind === 'dsl'
              ? await getOptionsListDslSuggestions({
                  abortedEvent$: request.events.aborted$,
                  request: request.body,
                  search: (body, options) =>
                    elasticsearch.client.asCurrentUser.search(body, options),
                  getAutocompleteSettings,
                })
              : await getOptionsListEsqlSuggestions({
                  abortedEvent$: request.events.aborted$,
                  request: request.body,
                  searchAsScoped: data.search.asScoped(request),
                  uiSettingsClient: uiSettings.client,
                });

          return response.ok({ body: suggestionsResponse });
        } catch (e) {
          const kbnErr = getKbnServerError(e as Error);
          return reportServerError(response, kbnErr);
        }
      }
    );
};

const getOptionsListEsqlSuggestions = async ({
  abortedEvent$,
  request,
  searchAsScoped,
  uiSettingsClient,
}: {
  request: OptionsListESQLFetchBody;
  abortedEvent$: Observable<void>;
  searchAsScoped: { search: import('@kbn/search-types').ISearchGeneric };
  uiSettingsClient: { get: <T = unknown>(key: string) => Promise<T> };
}): Promise<OptionsListResponse> => {
  const abortController = new AbortController();
  abortedEvent$.subscribe(() => abortController.abort());

  const timezone = (await uiSettingsClient.get(UI_SETTINGS.DATEFORMAT_TZ)) as string | undefined;

  const result = await getESQLSingleColumnValues({
    query: request.esql,
    search: searchAsScoped.search,
    signal: abortController.signal,
    timeRange: request.timeRange,
    filter: request.filter,
    esqlVariables: request.esqlVariables ?? [],
    timezone,
    projectRouting: request.projectRouting,
  });

  if (getESQLSingleColumnValues.isSuccess(result)) {
    return esqlColumnValuesToOptionsListResponse(result, {
      searchString: request.searchString,
      searchTechnique: request.searchTechnique,
      selectedOptions: request.selectedOptions,
      ignoreValidations: request.ignoreValidations,
      sort: request.sort,
    });
  }

  return { error: result.errors[0] };
};

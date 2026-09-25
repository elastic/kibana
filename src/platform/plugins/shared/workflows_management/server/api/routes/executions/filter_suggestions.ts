/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OptionsListDSLFetchBody } from '@kbn/controls-plugin/server';
import {
  getOptionsListDslSuggestions,
  optionsListDslFetchBodySchema,
} from '@kbn/controls-plugin/server';
import type { BoolQuery } from '@kbn/es-query';
import type { WorkflowExecutionFilterField } from '../../../../common';
import {
  WORKFLOW_EXECUTION_FILTER_FIELDS,
  WORKFLOW_EXECUTION_FILTER_SUGGESTIONS_PATH,
  WORKFLOWS_EXECUTIONS_INDEX,
} from '../../../../common';
import {
  buildManagedWorkflowExecutionsFilter,
  buildWorkflowExecutionsSpaceFilter,
} from '../../lib/build_workflow_executions_search_query';
import type { RouteDependencies } from '../types';
import { handleRouteError } from '../utils/route_error_handlers';
import {
  canReadManagedWorkflowExecutions,
  WORKFLOW_EXECUTION_READ_WITH_MANAGED_SECURITY,
} from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

/** Version the controls plugin's options list client sends on every suggestions request. */
const OPTIONS_LIST_API_VERSION = '1';

/** Wraps query clauses in the fully-populated `bool` shape the options list filters expect. */
const toBoolFilter = (clauses: Partial<BoolQuery>): { bool: BoolQuery } => ({
  bool: { must: [], must_not: [], filter: [], should: [], ...clauses },
});

const isFilterableField = (fieldName: string): fieldName is WorkflowExecutionFilterField =>
  (WORKFLOW_EXECUTION_FILTER_FIELDS as readonly string[]).includes(fieldName);

/**
 * Serves options list suggestions for the executions page filter controls.
 *
 * The controls' own route aggregates as the current user, which cannot read
 * `.workflows-executions`. This route applies the same authorization the executions table uses,
 * pins the query to the executions index of the current space, and aggregates with an internal
 * user.
 */
export function registerExecutionFilterSuggestionsRoute({
  router,
  api,
  spaces,
  getAutocompleteSettings,
}: RouteDependencies) {
  router.versioned
    .post({
      path: WORKFLOW_EXECUTION_FILTER_SUGGESTIONS_PATH,
      access: 'internal',
      security: WORKFLOW_EXECUTION_READ_WITH_MANAGED_SECURITY,
    })
    .addVersion(
      {
        version: OPTIONS_LIST_API_VERSION,
        validate: {
          request: {
            body: optionsListDslFetchBodySchema,
          },
        },
      },
      withAvailabilityCheck(async (_context, request, response) => {
        const body = request.body as OptionsListDSLFetchBody;

        if (!isFilterableField(body.fieldName)) {
          return response.badRequest({
            body: { message: `Unsupported filter field: ${body.fieldName}` },
          });
        }

        try {
          const spaceId = spaces.getSpaceId(request);
          const requiredFilters: NonNullable<OptionsListDSLFetchBody['filters']> = [
            toBoolFilter({
              filter: [buildWorkflowExecutionsSpaceFilter(spaceId)],
              must_not: [
                { exists: { field: 'stepId' } },
                ...(canReadManagedWorkflowExecutions(request)
                  ? []
                  : [buildManagedWorkflowExecutionsFilter()]),
              ],
            }),
          ];

          const suggestions = await getOptionsListDslSuggestions({
            abortedEvent$: request.events.aborted$,
            getAutocompleteSettings,
            request: {
              ...body,
              // The caller does not get to choose the index, the runtime mappings, or the
              // cross-project scope: this route reads one index with an internal user.
              index: WORKFLOWS_EXECUTIONS_INDEX,
              runtimeFieldMap: undefined,
              projectRouting: undefined,
              filters: [...(body.filters ?? []), ...requiredFilters],
            },
            search: ({ index: _index, ...searchBody }) => api.aggregateExecutions(searchBody),
          });

          return response.ok({ body: suggestions });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}

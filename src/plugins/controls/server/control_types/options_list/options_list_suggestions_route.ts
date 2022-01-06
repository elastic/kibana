/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, isEmpty } from 'lodash';
import { schema } from '@kbn/config-schema';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { Observable } from 'rxjs';
import { CoreSetup, ElasticsearchClient } from '../../../../../core/server';
import { getKbnServerError, reportServerError } from '../../../../kibana_utils/server';
import {
  OptionsListSuggestionRequest,
  OptionsListSuggestionResponse,
} from '../../../common/control_types/options_list/types';

export const setupOptionsListSuggestionsRoute = ({ http }: CoreSetup) => {
  const router = http.createRouter();

  router.post(
    {
      path: '/api/kibana/controls/optionsList/{index}',
      validate: {
        params: schema.object(
          {
            index: schema.string(),
          },
          { unknowns: 'allow' }
        ),
        body: schema.object(
          {
            field: schema.string(),
            filters: schema.maybe(schema.any()),
            searchString: schema.maybe(schema.string()),
            selectedOptions: schema.maybe(schema.arrayOf(schema.string())),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async (context, request, response) => {
      try {
        const suggestionRequest: OptionsListSuggestionRequest = request.body;
        const { index } = request.params;
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const suggestionsResponse = await getOptionsListSuggestions({
          abortedEvent$: request.events.aborted$,
          request: suggestionRequest,
          esClient,
          index,
        });
        return response.ok({ body: suggestionsResponse });
      } catch (e) {
        const kbnErr = getKbnServerError(e);
        return reportServerError(response, kbnErr);
      }
    }
  );
};

const getOptionsListSuggestions = async ({
  abortedEvent$,
  esClient,
  request,
  index,
}: {
  request: OptionsListSuggestionRequest;
  abortedEvent$: Observable<void>;
  esClient: ElasticsearchClient;
  index: string;
}): Promise<OptionsListSuggestionResponse> => {
  const abortController = new AbortController();
  abortedEvent$.subscribe(() => abortController.abort());

  const { field, searchString, selectedOptions, filters } = request;
  const body = getOptionsListBody(field, searchString, selectedOptions, filters);
  const rawEsResult = await esClient.search({ index, body }, { signal: abortController.signal });

  // parse raw ES response into OptionsListSuggestionResponse
  const totalCardinality = get(rawEsResult.body, 'aggregations.unique_terms.value');

  const suggestions = get(rawEsResult.body, 'aggregations.suggestions.buckets')?.map(
    (suggestion: { key: string }) => suggestion.key
  );

  const rawInvalidSuggestions = get(rawEsResult.body, 'aggregations.validation.buckets') as {
    [key: string]: { doc_count: number };
  };
  const invalidSelections =
    rawInvalidSuggestions && !isEmpty(rawInvalidSuggestions)
      ? Object.entries(rawInvalidSuggestions)
          ?.filter(([, value]) => value?.doc_count === 0)
          ?.map(([key]) => key)
      : undefined;

  return {
    suggestions,
    totalCardinality,
    invalidSelections,
  };
};

const getOptionsListBody = (
  field: string,
  searchString?: string,
  selectedOptions?: string[],
  filters: estypes.QueryDslQueryContainer[] = []
) => {
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html#_standard_operators
  const getEscapedQuery = (q: string = '') =>
    q.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (match) => `\\${match}`);

  // Helps ensure that the regex is not evaluated eagerly against the terms dictionary
  const executionHint = 'map' as const;

  // Suggestions
  const shardSize = 10;
  const suggestionsAgg = {
    terms: {
      field,
      include: `${getEscapedQuery(searchString ?? '')}.*`,
      execution_hint: executionHint,
      shard_size: shardSize,
    },
  };

  // Validation
  const selectedOptionsFilters = selectedOptions?.reduce((acc, currentOption) => {
    acc[currentOption] = { match: { [field]: currentOption } };
    return acc;
  }, {} as { [key: string]: { match: { [key: string]: string } } });

  const validationAgg =
    selectedOptionsFilters && !isEmpty(selectedOptionsFilters)
      ? {
          filters: {
            filters: selectedOptionsFilters,
          },
        }
      : undefined;

  const body = {
    size: 0,
    // timeout, // TODO: figure out how to get timeout and terminate_after config from data plugin
    // terminate_after,
    query: {
      bool: {
        filter: filters,
      },
    },
    aggs: {
      suggestions: suggestionsAgg,
      ...(validationAgg ? { validation: validationAgg } : {}),
      unique_terms: {
        cardinality: {
          field,
        },
      },
    },
  };

  // const subTypeNested = isFieldObject(field) && getFieldSubtypeNested(field);
  // if (isFieldObject(field) && subTypeNested) {
  //   return {
  //     ...body,
  //     aggs: {
  //       nestedSuggestions: {
  //         nested: {
  //           path: subTypeNested.nested.path,
  //         },
  //         aggs: body.aggs,
  //       },
  //     },
  //   };
  // }

  return body;
};

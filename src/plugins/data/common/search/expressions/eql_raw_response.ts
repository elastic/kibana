/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionTypeDefinition } from '../../../../expressions/common';
import { EqlSearchStrategyResponse } from '..';

const name = 'eql_raw_response';

export interface EqlRawResponse {
  type: typeof name;
  body: EqlSearchStrategyResponse['rawResponse']['body'];
}

export type EqlRawResponseExpressionTypeDefinition = ExpressionTypeDefinition<
  typeof name,
  EqlRawResponse,
  EqlRawResponse
>;

interface EqlReponseEvent {
  _source?: Record<string, unknown>;
  fields?: Record<string, unknown>;
}

interface EqlResponseSequence {
  events: EqlReponseEvent[];
}

interface EqlResponseBody {
  hits: {
    sequences?: EqlResponseSequence[];
    events: EqlReponseEvent[];
  };
}

const flatten = (obj: Record<string, unknown>) => {
  // @ts-ignore
  const _flatten = (o: Record<string, unknown>, path: string[] = []) => {
    return [].concat(
      ...Object.keys(o).map((k: string) => {
        if (typeof o[k] === 'object' && o[k] !== null && !Array.isArray(o[k])) {
          return _flatten(o[k] as Record<string, unknown>, [...path, k]);
        } else {
          const key = [...path, k].join('.');
          return { [key]: o[k] };
        }
      })
    );
  };

  return Object.assign({}, ..._flatten(obj));
};

const parseEventDocs = (events: EqlReponseEvent[]) => {
  return events
    .map((hit) => hit.fields || hit._source)
    .filter((hit) => hit)
    .map((event) => flatten(event as Record<string, any>));
};

const parseResponse = (hits: EqlResponseBody['hits']) => {
  if (hits.sequences) {
    return hits.sequences.flatMap((sequence) => parseEventDocs(sequence.events));
  }
  return parseEventDocs(hits.events);
};

export const eqlRawResponse: EqlRawResponseExpressionTypeDefinition = {
  name,
  to: {
    datatable: (context: EqlRawResponse) => {
      // improved handling needs to be added when we know some usecases
      const rows = parseResponse((context.body as EqlResponseBody).hits);
      const columns = rows.length
        ? Object.keys(rows[0]).map((key) => ({
            id: key,
            name: key,
            meta: {
              type: typeof rows[0][key],
              field: key,
              params: {},
            },
          }))
        : [];

      return {
        type: 'datatable',
        meta: {
          type: 'eql',
          source: '*',
        },
        columns,
        rows,
      };
    },
  },
};

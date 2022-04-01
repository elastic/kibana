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

// duplocated from x-pack/timelines plugin
export type SearchTypes =
  | string
  | string[]
  | number
  | number[]
  | boolean
  | boolean[]
  | object
  | object[]
  | undefined;

export interface TotalValue {
  value: number;
  relation: string;
}

export interface BaseHit<T> {
  _index: string;
  _id: string;
  _source: T;
  fields?: Record<string, SearchTypes[]>;
}

export interface EqlSequence<T> {
  join_keys: SearchTypes[];
  events: Array<BaseHit<T>>;
}

export interface EqlSearchResponse<T> {
  is_partial: boolean;
  is_running: boolean;
  took: number;
  timed_out: boolean;
  hits: {
    total: TotalValue;
    sequences?: Array<EqlSequence<T>>;
    events?: Array<BaseHit<T>>;
  };
}

export type EqlRawResponseExpressionTypeDefinition = ExpressionTypeDefinition<
  typeof name,
  EqlRawResponse,
  EqlRawResponse
>;

const flatten = (obj: Record<string, unknown>) => {
  const _flatten = (o: Record<string, unknown>, path: string[] = []): unknown[] => {
    return Object.keys(o)
      .map((k: string) => {
        if (typeof o[k] === 'object' && o[k] !== null && !Array.isArray(o[k])) {
          return _flatten(o[k] as Record<string, unknown>, [...path, k]);
        } else {
          const key = [...path, k].join('.');
          return { [key]: o[k] };
        }
      })
      .flat();
  };

  return Object.assign({}, ..._flatten(obj));
};

const parseEventDocs = (events: Array<BaseHit<unknown>>, joinKeys?: unknown[]) => {
  return events
    .map((hit) => hit.fields || hit._source)
    .filter((hit) => hit)
    .map((event) => flatten(event as Record<string, unknown>))
    .map((event) => {
      if (joinKeys) {
        event.joinKeys = joinKeys;
      }
      return event;
    });
};

const parseResponse = (hits: EqlSearchResponse<unknown>['hits']) => {
  if (hits.sequences) {
    return hits.sequences.flatMap((sequence) =>
      parseEventDocs(sequence.events, sequence.join_keys)
    );
  }
  return parseEventDocs(hits.events!);
};

export const eqlRawResponse: EqlRawResponseExpressionTypeDefinition = {
  name,
  to: {
    datatable: (context: EqlRawResponse) => {
      // improved handling needs to be added when we know some usecases
      const rows = parseResponse((context.body as EqlSearchResponse<unknown>).hits);
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
          statistics: {
            totalCount: (context.body as EqlSearchResponse<unknown>).hits.total?.value,
          },
        },
        columns,
        rows,
      };
    },
  },
};

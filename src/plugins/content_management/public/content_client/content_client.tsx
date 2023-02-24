/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { QueryClient } from '@tanstack/react-query';
import { createQueryObservable } from './query_observable';
import type { CrudClient } from '../crud_client';
import type { CreateIn, GetIn, UpdateIn, DeleteIn, SearchIn } from '../../common';

export const queryKeyBuilder = {
  all: (type: string) => [type] as const,
  item: (type: string, id: string) => {
    return [...queryKeyBuilder.all(type), id] as const;
  },
  search: (type: string, query: unknown) => {
    return [...queryKeyBuilder.all(type), 'search', query] as const;
  },
};

const createQueryOptionBuilder = ({
  crudClientProvider,
}: {
  crudClientProvider: (contentType: string) => CrudClient;
}) => {
  return {
    get: <I extends GetIn = GetIn, O = unknown>(input: I) => {
      return {
        queryKey: queryKeyBuilder.item(input.contentTypeId, input.id),
        queryFn: () => crudClientProvider(input.contentTypeId).get(input) as Promise<O>,
      };
    },
    search: <I extends SearchIn = SearchIn, O = unknown>(input: I) => {
      return {
        queryKey: queryKeyBuilder.search(input.contentTypeId, input.query),
        queryFn: () => crudClientProvider(input.contentTypeId).search(input) as Promise<O>,
      };
    },
  };
};

export class ContentClient {
  readonly queryClient: QueryClient;
  readonly queryOptionBuilder: ReturnType<typeof createQueryOptionBuilder>;

  constructor(private readonly crudClientProvider: (contentType: string) => CrudClient) {
    this.queryClient = new QueryClient();
    this.queryOptionBuilder = createQueryOptionBuilder({
      crudClientProvider: this.crudClientProvider,
    });
  }

  get<I extends GetIn = GetIn, O = unknown>(input: I): Promise<O> {
    return this.queryClient.fetchQuery(this.queryOptionBuilder.get(input));
  }

  get$<I extends GetIn = GetIn, O = unknown>(input: I) {
    return createQueryObservable(this.queryClient, this.queryOptionBuilder.get<I, O>(input));
  }

  create<I extends CreateIn, O = unknown>(input: I): Promise<O> {
    return this.crudClientProvider(input.contentTypeId).create(input) as Promise<O>;
  }

  update<I extends UpdateIn, O = unknown>(input: I): Promise<O> {
    return this.crudClientProvider(input.contentTypeId).update(input) as Promise<O>;
  }

  delete<I extends DeleteIn, O = unknown>(input: I): Promise<O> {
    return this.crudClientProvider(input.contentTypeId).delete(input) as Promise<O>;
  }

  search<I extends SearchIn, O = unknown>(input: I): Promise<O> {
    return this.crudClientProvider(input.contentTypeId).search(input) as Promise<O>;
  }

  search$<I extends SearchIn, O = unknown>(input: I) {
    return createQueryObservable(this.queryClient, this.queryOptionBuilder.search<I, O>(input));
  }
}

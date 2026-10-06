/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryClient } from '@kbn/react-query';
import type { CrudClient } from '../crud_client';
import type {
  CreateIn,
  GetIn,
  UpdateIn,
  DeleteIn,
  SearchIn,
  MSearchIn,
  MSearchResult,
} from '../../common';
import type { ContentTypeRegistry } from '../registry';
export declare const queryKeyBuilder: {
  all: (type: string) => readonly [string];
  item: (type: string, id: string) => readonly [string, string];
  search: (
    type: string,
    query: unknown,
    options?: object
  ) => readonly [string, 'search', unknown, object | undefined];
};
declare const createQueryOptionBuilder: ({
  crudClientProvider,
  contentTypeRegistry,
}: {
  crudClientProvider: (contentType: string) => CrudClient;
  contentTypeRegistry: ContentTypeRegistry;
}) => {
  get: <I extends GetIn = GetIn, O = unknown>(
    _input: I
  ) => {
    queryKey: readonly [string, string];
    queryFn: () => Promise<O>;
  };
  search: <I extends SearchIn = SearchIn, O = unknown>(
    _input: I
  ) => {
    queryKey: readonly [string, 'search', unknown, object | undefined];
    queryFn: () => Promise<O>;
  };
};
export declare class ContentClient {
  private readonly crudClientProvider;
  private readonly contentTypeRegistry;
  readonly queryClient: QueryClient;
  readonly queryOptionBuilder: ReturnType<typeof createQueryOptionBuilder>;
  constructor(
    crudClientProvider: (contentType?: string) => CrudClient,
    contentTypeRegistry: ContentTypeRegistry
  );
  get<I extends GetIn = GetIn, O = unknown>(input: I): Promise<O>;
  get$<I extends GetIn = GetIn, O = unknown>(
    input: I
  ): import('rxjs').Observable<import('@tanstack/query-core').QueryObserverResult<O, unknown>>;
  create<I extends CreateIn, O = unknown>(input: I): Promise<O>;
  update<I extends UpdateIn, O = unknown>(input: I): Promise<O>;
  delete<I extends DeleteIn, O = unknown>(input: I): Promise<O>;
  search<I extends SearchIn, O = unknown>(input: I): Promise<O>;
  search$<I extends SearchIn, O = unknown>(
    input: I
  ): import('rxjs').Observable<import('@tanstack/query-core').QueryObserverResult<O, unknown>>;
  mSearch<T = unknown>(input: MSearchIn): Promise<MSearchResult<T>>;
}
export {};

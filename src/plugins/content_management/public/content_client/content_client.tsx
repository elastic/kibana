/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { QueryClient } from '@tanstack/react-query';
import { validateVersion } from '@kbn/object-versioning-utils';
import type { Version } from '@kbn/object-versioning';
import { createQueryObservable } from './query_observable';
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

export const queryKeyBuilder = {
  all: (type: string) => [type] as const,
  item: (type: string, id: string) => {
    return [...queryKeyBuilder.all(type), id] as const;
  },
  search: (type: string, query: unknown, options?: object) => {
    return [...queryKeyBuilder.all(type), 'search', query, options] as const;
  },
};

const addVersion = <I extends { contentTypeId: string; version?: Version }>(
  input: I,
  contentTypeRegistry: ContentTypeRegistry
): I & { version: Version } => {
  const contentType = contentTypeRegistry.get(input.contentTypeId);

  if (!contentType) {
    throw new Error(`Unknown content type [${input.contentTypeId}]`);
  }

  const version = input.version ?? contentType.version.latest;

  const { result, value } = validateVersion(version);

  if (!result) {
    throw new Error(`Invalid version [${version}]. Must be an integer.`);
  }

  if (value > contentType.version.latest) {
    throw new Error(
      `Invalid version [${version}]. Latest version is [${contentType.version.latest}]`
    );
  }

  return {
    ...input,
    version,
  };
};

const createQueryOptionBuilder = ({
  crudClientProvider,
  contentTypeRegistry,
}: {
  crudClientProvider: (contentType: string) => CrudClient;
  contentTypeRegistry: ContentTypeRegistry;
}) => {
  return {
    get: <I extends GetIn = GetIn, O = unknown>(_input: I) => {
      const input = addVersion(_input, contentTypeRegistry);
      return {
        queryKey: queryKeyBuilder.item(input.contentTypeId, input.id),
        queryFn: () => crudClientProvider(input.contentTypeId).get(input) as Promise<O>,
      };
    },
    search: <I extends SearchIn = SearchIn, O = unknown>(_input: I) => {
      const input = addVersion(_input, contentTypeRegistry);

      return {
        queryKey: queryKeyBuilder.search(input.contentTypeId, input.query, input.options),
        queryFn: () => crudClientProvider(input.contentTypeId).search(input) as Promise<O>,
      };
    },
  };
};

export class ContentClient {
  readonly queryClient: QueryClient;
  readonly queryOptionBuilder: ReturnType<typeof createQueryOptionBuilder>;

  constructor(
    private readonly crudClientProvider: (contentType?: string) => CrudClient,
    private readonly contentTypeRegistry: ContentTypeRegistry
  ) {
    this.queryClient = new QueryClient({ defaultOptions: { queries: { networkMode: 'always' } } });
    this.queryOptionBuilder = createQueryOptionBuilder({
      crudClientProvider: this.crudClientProvider,
      contentTypeRegistry: this.contentTypeRegistry,
    });
  }

  get<I extends GetIn = GetIn, O = unknown>(input: I): Promise<O> {
    return this.queryClient.fetchQuery(this.queryOptionBuilder.get(input));
  }

  get$<I extends GetIn = GetIn, O = unknown>(input: I) {
    return createQueryObservable(this.queryClient, this.queryOptionBuilder.get<I, O>(input));
  }

  create<I extends CreateIn, O = unknown>(input: I): Promise<O> {
    return this.crudClientProvider(input.contentTypeId).create(
      addVersion(input, this.contentTypeRegistry)
    ) as Promise<O>;
  }

  update<I extends UpdateIn, O = unknown>(input: I): Promise<O> {
    return this.crudClientProvider(input.contentTypeId).update(
      addVersion(input, this.contentTypeRegistry)
    ) as Promise<O>;
  }

  delete<I extends DeleteIn, O = unknown>(input: I): Promise<O> {
    return this.crudClientProvider(input.contentTypeId).delete(
      addVersion(input, this.contentTypeRegistry)
    ) as Promise<O>;
  }

  search<I extends SearchIn, O = unknown>(input: I): Promise<O> {
    return this.crudClientProvider(input.contentTypeId).search(
      addVersion(input, this.contentTypeRegistry)
    ) as Promise<O>;
  }

  search$<I extends SearchIn, O = unknown>(input: I) {
    return createQueryObservable(
      this.queryClient,
      this.queryOptionBuilder.search<I, O>(addVersion(input, this.contentTypeRegistry))
    );
  }

  mSearch<T = unknown>(input: MSearchIn): Promise<MSearchResult<T>> {
    const crudClient = this.crudClientProvider();
    if (!crudClient.mSearch) {
      throw new Error('mSearch is not supported by provided crud client');
    }

    return crudClient.mSearch({
      ...input,
      contentTypes: input.contentTypes.map((contentType) =>
        addVersion(contentType, this.contentTypeRegistry)
      ),
    }) as Promise<MSearchResult<T>>;
  }
}

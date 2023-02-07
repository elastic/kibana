/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useQuery, QueryObserverOptions } from '@tanstack/react-query';
import { useContentClient } from './content_client_context';
import type { GetIn } from '../../common';

/**
 * Exposed `useQuery` options
 */
export type QueryOptions = Pick<QueryObserverOptions, 'enabled'>;

/**
 *
 * @param input - get content identifier like "id" and "contentType"
 * @param queryOptions -
 */
export const useGetContentQuery = <I extends GetIn = GetIn, O = unknown>(
  input: I,
  queryOptions?: QueryOptions
) => {
  const contentClient = useContentClient();
  return useQuery({
    ...contentClient.queryOptionBuilder.get<I, O>(input),
    ...queryOptions,
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UseMutationOptions } from '@tanstack/react-query';
import type { ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useMutation } from '@tanstack/react-query';
import type { PatchListItemParams } from '@kbn/securitysolution-list-api';
import { patchListItem } from '@kbn/securitysolution-list-api';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import { useInvalidateListItemQuery } from '../use_find_list_items';

const patchListItemWithOptionalSignal = withOptionalSignal(patchListItem);

export const PATCH_LIST_ITEM_MUTATION_KEY = ['PATCH', 'LIST_ITEM_MUTATION'];
type PatchListMutationParams = Omit<PatchListItemParams, 'refresh' | 'signal'>;

export const usePatchListItemMutation = (
  options?: UseMutationOptions<ListItemSchema, IHttpFetchError<Error>, PatchListMutationParams>
) => {
  const invalidateListItemQuery = useInvalidateListItemQuery();
  return useMutation<ListItemSchema, IHttpFetchError<Error>, PatchListMutationParams>(
    ({ id, value, _version, http }: PatchListMutationParams) =>
      patchListItemWithOptionalSignal({ id, value, http, refresh: true, _version }),
    {
      ...options,
      mutationKey: PATCH_LIST_ITEM_MUTATION_KEY,
      onSettled: (...args) => {
        invalidateListItemQuery();
        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};

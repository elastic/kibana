/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseMutationOptions } from '@tanstack/react-query';
import type { ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useMutation } from '@tanstack/react-query';
import { createListItem } from '@kbn/securitysolution-list-api';
import type { CreateListItemParams } from '@kbn/securitysolution-list-api';
import { withOptionalSignal } from '@kbn/securitysolution-hook-utils';

import { useInvalidateListItemQuery } from '../use_find_list_items';

const createListItemWithOptionalSignal = withOptionalSignal(createListItem);

export const CREATE_LIST_ITEM_MUTATION_KEY = ['POST', 'LIST_ITEM_CREATE'];
type CreateListMutationParams = Omit<CreateListItemParams, 'refresh' | 'signal'>;

export const useCreateListItemMutation = (
  options?: UseMutationOptions<ListItemSchema, IHttpFetchError<Error>, CreateListMutationParams>
) => {
  const invalidateListItemQuery = useInvalidateListItemQuery();
  return useMutation<ListItemSchema, IHttpFetchError<Error>, CreateListMutationParams>(
    ({ listId, value, http }) =>
      createListItemWithOptionalSignal({ listId, value, http, refresh: 'true' }),
    {
      ...options,
      mutationKey: CREATE_LIST_ITEM_MUTATION_KEY,
      onSettled: (...args) => {
        invalidateListItemQuery();
        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};

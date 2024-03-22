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
import { deleteListItem } from '@kbn/securitysolution-list-api';
import type { DeleteListItemParams } from '@kbn/securitysolution-list-api';

import { useInvalidateListItemQuery } from '../use_find_list_items';

export const DELETE_LIST_ITEM_MUTATION_KEY = ['POST', ' DELETE_LIST_ITEM_MUTATION'];
type DeleteListMutationParams = Omit<DeleteListItemParams, 'refresh'>;

export const useDeleteListItemMutation = (
  options?: UseMutationOptions<ListItemSchema, Error, DeleteListMutationParams>
) => {
  const invalidateListItemQuery = useInvalidateListItemQuery();
  return useMutation<ListItemSchema, Error, DeleteListMutationParams>(
    ({ id, http }) => deleteListItem({ id, http, refresh: true }),
    {
      ...options,
      mutationKey: DELETE_LIST_ITEM_MUTATION_KEY,
      onSettled: (...args) => {
        invalidateListItemQuery();
        if (options?.onSettled) {
          options.onSettled(...args);
        }
      },
    }
  );
};

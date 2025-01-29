/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMutation } from '@tanstack/react-query';
import { useContentClient } from './content_client_context';
import type { CreateIn, UpdateIn, DeleteIn } from '../../common';
import { queryKeyBuilder } from './content_client';

export const useCreateContentMutation = <I extends CreateIn = CreateIn, O = unknown>() => {
  const contentClient = useContentClient();
  return useMutation({
    mutationFn: (input: I) => {
      return contentClient.create<I, O>(input);
    },
    onSuccess: (data, variables) => {
      contentClient.queryClient.invalidateQueries({
        queryKey: queryKeyBuilder.all(variables.contentTypeId),
      });
    },
  });
};

export const useUpdateContentMutation = <I extends UpdateIn = UpdateIn, O = unknown>() => {
  const contentClient = useContentClient();
  return useMutation({
    mutationFn: (input: I) => {
      return contentClient.update<I, O>(input);
    },
    onSuccess: (data, variables) => {
      contentClient.queryClient.invalidateQueries({
        queryKey: queryKeyBuilder.all(variables.contentTypeId),
      });
    },
  });
};

export const useDeleteContentMutation = <I extends DeleteIn = DeleteIn, O = unknown>() => {
  const contentClient = useContentClient();
  return useMutation({
    mutationFn: (input: I) => {
      return contentClient.delete<I, O>(input);
    },
    onSuccess: (data, variables) => {
      contentClient.queryClient.invalidateQueries({
        queryKey: queryKeyBuilder.all(variables.contentTypeId),
      });
    },
  });
};

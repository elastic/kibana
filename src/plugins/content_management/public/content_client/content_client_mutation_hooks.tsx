/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMutation } from '@tanstack/react-query';
import { useContentClient } from './content_client_context';
import type { CreateIn } from '../../common';

export const useCreateContentMutation = <I extends CreateIn = CreateIn, O = unknown>() => {
  const contentClient = useContentClient();
  return useMutation({
    mutationFn: (input: I) => {
      return contentClient.create(input);
    },
  });
};

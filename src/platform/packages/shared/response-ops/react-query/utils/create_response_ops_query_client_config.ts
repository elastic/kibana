/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryClientConfig } from '@kbn/react-query';
import { QueryClient } from '@kbn/react-query';
import { QueryCache } from '@kbn/react-query';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { ResponseOpsQueryMeta } from '../types';

const EMPTY_CONFIG: QueryClientConfig = {};

export const createResponseOpsQueryClient = (options?: {
  config?: QueryClientConfig;
  dependencies?: {
    notifications: {
      toasts: IToasts;
    };
  };
}) => {
  const { config = EMPTY_CONFIG, dependencies } = options || {};
  const toasts = dependencies?.notifications.toasts;
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        const toastOptions = (query.meta as ResponseOpsQueryMeta | undefined)?.getErrorToast?.(
          error
        );
        if (toasts && toastOptions) {
          if (toastOptions.type === 'danger') {
            const { type, ...toastInputFields } = toastOptions;
            toasts.addDanger(toastInputFields);
            return;
          }
          const { type, ...errorToastOptions } = toastOptions;
          toasts.addError(error, errorToastOptions);
        }
      },
    }),
    ...config,
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
      ...config.defaultOptions,
    },
  });
};

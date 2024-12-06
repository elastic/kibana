/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { InferenceProvider } from '../../types';
import { INTERNAL_BASE_GEN_AI_API_PATH } from '../../constants';

export const getProviders = async (http: HttpSetup): Promise<InferenceProvider[]> => {
  return await http.get(`${INTERNAL_BASE_GEN_AI_API_PATH}/_inference/_services`);
};

export const useProviders = (http: HttpSetup, toasts: ToastsStart) => {
  const onErrorFn = (error: Error) => {
    if (error) {
      toasts.addDanger(
        i18n.translate(
          'xpack.stackConnectors.components.inference.unableToFindProvidersQueryMessage',
          {
            defaultMessage: 'Unable to find providers',
          }
        )
      );
    }
  };

  const query = useQuery(['user-profile'], {
    queryFn: () => getProviders(http),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    onError: onErrorFn,
  });
  return query;
};

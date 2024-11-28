/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMutation } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { APIRoutes } from '../types';

export const useValidateApiKey = (): ((id: string) => Promise<boolean>) => {
  const { http } = useKibana().services;
  const { mutateAsync: validateApiKey } = useMutation(async (id: string) => {
    try {
      if (!http?.post) {
        throw new Error('HTTP service is unavailable');
      }

      const response = await http.post<{ isValid: boolean }>(APIRoutes.API_KEY_VALIDITY, {
        body: JSON.stringify({ id }),
      });

      return response.isValid;
    } catch (err) {
      return false;
    }
  });

  return validateApiKey;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { HttpSetup } from 'kibana/public';
import { EsConfigApiResponse } from '../../../common/types/api_responses';
import { sendRequest } from '../../shared_imports';

interface Dependencies {
  http: HttpSetup;
}

export type Api = ReturnType<typeof createApi>;

export const createApi = ({ http }: Dependencies) => {
  return {
    getEsConfig: () => {
      return sendRequest<EsConfigApiResponse>(http, {
        path: '/api/console/es_config',
        method: 'get',
      });
    },
  };
};

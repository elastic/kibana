/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

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

import { ISearchSessionService } from './types';

/**
 * The OSS session service, which leaves most search session-related logic unimplemented.
 * @see x-pack/plugins/data_enhanced/server/search/session/session_service.ts
 */
export class SearchSessionService implements ISearchSessionService {
  constructor() {}

  public asScopedProvider() {
    return () => ({
      getId: () => {
        throw new Error('getId not implemented in OSS search session service');
      },
      trackId: async () => {},
      getSearchIdMapping: async () => new Map<string, string>(),
      save: async () => {
        throw new Error('save not implemented in OSS search session service');
      },
      get: async () => {
        throw new Error('get not implemented in OSS search session service');
      },
      find: async () => {
        throw new Error('find not implemented in OSS search session service');
      },
      update: async () => {
        throw new Error('update not implemented in OSS search session service');
      },
      extend: async () => {
        throw new Error('extend not implemented in OSS search session service');
      },
      delete: async () => {
        throw new Error('delete not implemented in OSS search session service');
      },
    });
  }
}

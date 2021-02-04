/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISearchSessionService } from './types';

/**
 * The OSS session service, which leaves most search session-related logic unimplemented.
 * @see x-pack/plugins/data_enhanced/server/search/session/session_service.ts
 * @internal
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
      cancel: async () => {
        throw new Error('cancel not implemented in OSS search session service');
      },
    });
  }
}

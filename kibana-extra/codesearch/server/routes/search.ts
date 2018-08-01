/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { RepositorySearchRequest } from '../../model';
import { Server } from '../kibana_types';
import { RepositorySearchClient } from '../search';

export function repositorySearchRoute(server: Server, repoSearchClient: RepositorySearchClient) {
  server.route({
    path: '/api/cs/search/repo',
    method: 'GET',
    async handler(req, reply) {
      const searchReq: RepositorySearchRequest = {
        query: req.query.q,
        page: 1,
        resultsPerPage: 50,
      };
      try {
        const res = await repoSearchClient.search(searchReq);
        reply(res);
      } catch (error) {
        reply(Boom.internal(`Search Exception ${error}`));
      }
    },
  });
}

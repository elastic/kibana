/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import hapi from 'hapi';
import { DocumentSearchRequest, RepositorySearchRequest, SymbolSearchRequest } from '../../model';
import { DocumentSearchClient, RepositorySearchClient, SymbolSearchClient } from '../search';

export function repositorySearchRoute(
  server: hapi.Server,
  repoSearchClient: RepositorySearchClient
) {
  server.route({
    path: '/api/cs/search/repo',
    method: 'GET',
    async handler(req) {
      let page = 1;
      if (req.query.p) {
        page = parseInt(req.query.p, 10);
      }
      const searchReq: RepositorySearchRequest = {
        query: req.query.q,
        page,
      };
      try {
        const res = await repoSearchClient.search(searchReq);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception ${error}`);
      }
    },
  });
}

export function documentSearchRoute(server: hapi.Server, docSearchClient: DocumentSearchClient) {
  server.route({
    path: '/api/cs/search/doc',
    method: 'GET',
    async handler(req) {
      let page = 1;
      if (req.query.p) {
        page = parseInt(req.query.p, 10);
      }
      const searchReq: DocumentSearchRequest = {
        query: req.query.q,
        page,
        langFilters: req.query.langs ? req.query.langs.split(',') : [],
        repoFileters: req.query.repos ? decodeURIComponent(req.query.repos).split(',') : [],
      };
      try {
        const res = await docSearchClient.search(searchReq);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception ${error}`);
      }
    },
  });
}

export function symbolSearchRoute(server: hapi.Server, symbolSearchClient: SymbolSearchClient) {
  server.route({
    path: '/api/cs/search/symbol',
    method: 'GET',
    async handler(req: hapi.Request) {
      let page = 1;
      if (req.query.p) {
        page = parseInt(req.query.p, 10);
      }
      const searchReq: SymbolSearchRequest = {
        query: req.query.q,
        page,
      };
      try {
        const res = await symbolSearchClient.search(searchReq);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception ${error}`);
      }
    },
  });
}

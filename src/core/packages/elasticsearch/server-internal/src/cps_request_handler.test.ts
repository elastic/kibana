/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TransportRequestParams } from '@elastic/elasticsearch';
import { PROJECT_ROUTING_ORIGIN, PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import { getCpsRequestHandler } from './cps_request_handler';

describe('getCpsRequestHandler', () => {
  describe('when CPS is enabled', () => {
    it('uses the provided projectRouting value when injecting', () => {
      const onRequest = getCpsRequestHandler(true, PROJECT_ROUTING_ORIGIN);
      const params: TransportRequestParams = {
        method: 'GET',
        path: '/_search',
        meta: { name: 'search', acceptedParams: ['project_routing'] },
        body: { query: { match_all: {} } },
      };

      onRequest({ scoped: true }, params, {});

      expect(params.body).toEqual({
        query: { match_all: {} },
        project_routing: PROJECT_ROUTING_ORIGIN,
      });
    });

    it('uses a custom projectRouting value (e.g. space-based NPRE)', () => {
      const spaceNpre = 'kibana_space_my-space_default';
      const onRequest = getCpsRequestHandler(true, spaceNpre);
      const params: TransportRequestParams = {
        method: 'GET',
        path: '/_search',
        meta: { name: 'search', acceptedParams: ['project_routing'] },
        body: {},
      };

      onRequest({ scoped: true }, params, {});

      expect((params.body as Record<string, unknown>)?.project_routing).toBe(spaceNpre);
    });

    it('uses PROJECT_ROUTING_ALL when provided', () => {
      const onRequest = getCpsRequestHandler(true, PROJECT_ROUTING_ALL);
      const params: TransportRequestParams = {
        method: 'GET',
        path: '/_search',
        meta: { name: 'search', acceptedParams: ['project_routing'] },
        body: {},
      };

      onRequest({ scoped: true }, params, {});

      expect((params.body as Record<string, unknown>)?.project_routing).toBe(PROJECT_ROUTING_ALL);
    });

    describe('injection behavior', () => {
      const onRequest = getCpsRequestHandler(true, PROJECT_ROUTING_ORIGIN);

      it('does not inject when API does not support project_routing', () => {
        const params: TransportRequestParams = {
          method: 'GET',
          path: '/_cat/indices',
          meta: { name: 'cat/indices', acceptedParams: [] },
        };

        onRequest({ scoped: true }, params, {});

        expect(params.body).toBeUndefined();
      });

      it('does not override project_routing already present in body', () => {
        const params: TransportRequestParams = {
          method: 'GET',
          path: '/_search',
          meta: { name: 'search', acceptedParams: ['project_routing'] },
          body: { project_routing: 'custom-value' },
        };

        onRequest({ scoped: true }, params, {});

        expect((params.body as Record<string, unknown>)?.project_routing).toBe('custom-value');
      });

      it('does not inject project_routing for PIT-based searches', () => {
        const params: TransportRequestParams = {
          method: 'POST',
          path: '/_search',
          body: { pit: { id: 'abc123' } },
          meta: { name: 'search', acceptedParams: ['project_routing'] },
        };

        onRequest({ scoped: true }, params, {});

        expect((params.body as Record<string, unknown>)?.project_routing).toBeUndefined();
      });

      it('strips project_routing from body for PIT-based searches', () => {
        const params: TransportRequestParams = {
          method: 'POST',
          path: '/_search',
          body: { pit: { id: 'abc123' }, project_routing: 'should-be-removed' },
          meta: { name: 'search', acceptedParams: ['project_routing'] },
        };

        onRequest({ scoped: true }, params, {});

        expect((params.body as Record<string, unknown>)?.project_routing).toBeUndefined();
        expect((params.body as Record<string, unknown>)?.pit).toEqual({ id: 'abc123' });
      });

      it('preserves existing body fields when injecting', () => {
        const params: TransportRequestParams = {
          method: 'GET',
          path: '/_search',
          meta: { name: 'search', acceptedParams: ['project_routing'] },
          body: { query: { match_all: {} } },
        };

        onRequest({ scoped: true }, params, {});

        expect(params.body).toEqual({
          query: { match_all: {} },
          project_routing: PROJECT_ROUTING_ORIGIN,
        });
      });
    });
  });

  describe('when CPS is disabled', () => {
    const onRequest = getCpsRequestHandler(false, PROJECT_ROUTING_ORIGIN);

    it('does not inject project_routing', () => {
      const params: TransportRequestParams = {
        method: 'GET',
        path: '/_search',
        meta: { name: 'search', acceptedParams: ['project_routing'] },
      };

      onRequest({ scoped: true }, params, {});

      expect(params.body).toBeUndefined();
    });

    it('strips project_routing from body', () => {
      const params: TransportRequestParams = {
        method: 'GET',
        path: '/_search',
        meta: { name: 'search', acceptedParams: ['project_routing'] },
        body: { query: { match_all: {} }, project_routing: 'should-be-removed' },
      };

      onRequest({ scoped: true }, params, {});

      expect((params.body as Record<string, unknown>)?.project_routing).toBeUndefined();
      expect((params.body as Record<string, unknown>)?.query).toEqual({ match_all: {} });
    });

    it('strips project_routing even when API does not support it', () => {
      const params: TransportRequestParams = {
        method: 'GET',
        path: '/_bulk',
        meta: { name: 'bulk', acceptedParams: [] },
        body: { project_routing: 'should-be-stripped' },
      };

      onRequest({ scoped: true }, params, {});

      expect((params.body as Record<string, unknown>)?.project_routing).toBeUndefined();
    });
  });
});

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

// Structured acceptedParams shapes as emitted by elasticsearch-js v9.3.3+.
const bodyAcceptedParams = {
  path: [] as string[],
  body: ['project_routing'],
  query: [] as string[],
};
const queryAcceptedParams = {
  path: [] as string[],
  body: [] as string[],
  query: ['project_routing'],
};
const noProjectRouting = { path: [] as string[], body: [] as string[], query: [] as string[] };

describe('getCpsRequestHandler', () => {
  describe('when CPS is enabled', () => {
    it('uses the provided projectRouting value when injecting', () => {
      const onRequest = getCpsRequestHandler(true, PROJECT_ROUTING_ORIGIN);
      const params: TransportRequestParams = {
        method: 'GET',
        path: '/_search',
        meta: { name: 'search', acceptedParams: bodyAcceptedParams },
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
        meta: { name: 'search', acceptedParams: bodyAcceptedParams },
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
        meta: { name: 'search', acceptedParams: bodyAcceptedParams },
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
          meta: { name: 'cat/indices', acceptedParams: noProjectRouting },
        };

        onRequest({ scoped: true }, params, {});

        expect(params.body).toBeUndefined();
      });

      it('does not override project_routing already present in body', () => {
        const params: TransportRequestParams = {
          method: 'GET',
          path: '/_search',
          meta: { name: 'search', acceptedParams: bodyAcceptedParams },
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
          meta: { name: 'search', acceptedParams: bodyAcceptedParams },
        };

        onRequest({ scoped: true }, params, {});

        expect((params.body as Record<string, unknown>)?.project_routing).toBeUndefined();
      });

      it('strips project_routing from body for PIT-based searches', () => {
        const params: TransportRequestParams = {
          method: 'POST',
          path: '/_search',
          body: { pit: { id: 'abc123' }, project_routing: 'should-be-removed' },
          meta: { name: 'search', acceptedParams: bodyAcceptedParams },
        };

        onRequest({ scoped: true }, params, {});

        expect((params.body as Record<string, unknown>)?.project_routing).toBeUndefined();
        expect((params.body as Record<string, unknown>)?.pit).toEqual({ id: 'abc123' });
      });

      it('preserves existing body fields when injecting', () => {
        const params: TransportRequestParams = {
          method: 'GET',
          path: '/_search',
          meta: { name: 'search', acceptedParams: bodyAcceptedParams },
          body: { query: { match_all: {} } },
        };

        onRequest({ scoped: true }, params, {});

        expect(params.body).toEqual({
          query: { match_all: {} },
          project_routing: PROJECT_ROUTING_ORIGIN,
        });
      });
    });

    describe('APIs with project_routing in query (e.g. msearch, msearch_template)', () => {
      const onRequest = getCpsRequestHandler(true, PROJECT_ROUTING_ORIGIN);

      it.each(['msearch', 'msearch_template'])(
        'injects project_routing as a query param for %s',
        (apiName) => {
          const params: TransportRequestParams = {
            method: 'POST',
            path: `/_${apiName}`,
            meta: { name: apiName, acceptedParams: queryAcceptedParams },
            body: 'header\nbody\n',
          };

          onRequest({ scoped: true }, params, {});

          expect((params.querystring as Record<string, unknown>)?.project_routing).toBe(
            PROJECT_ROUTING_ORIGIN
          );
          expect(params.body).toBe('header\nbody\n');
        }
      );

      it.each(['msearch', 'msearch_template'])(
        'creates querystring object when not present for %s',
        (apiName) => {
          const params: TransportRequestParams = {
            method: 'POST',
            path: `/_${apiName}`,
            meta: { name: apiName, acceptedParams: queryAcceptedParams },
            body: 'header\nbody\n',
          };

          expect(params.querystring).toBeUndefined();
          onRequest({ scoped: true }, params, {});

          expect(params.querystring).toEqual({ project_routing: PROJECT_ROUTING_ORIGIN });
        }
      );

      it.each(['msearch', 'msearch_template'])(
        'does not override existing project_routing in querystring for %s',
        (apiName) => {
          const params: TransportRequestParams = {
            method: 'POST',
            path: `/_${apiName}`,
            meta: { name: apiName, acceptedParams: queryAcceptedParams },
            body: 'header\nbody\n',
            querystring: { project_routing: 'custom-value' },
          };

          onRequest({ scoped: true }, params, {});

          expect((params.querystring as Record<string, unknown>)?.project_routing).toBe(
            'custom-value'
          );
        }
      );

      it.each(['msearch', 'msearch_template'])('does not inject into body for %s', (apiName) => {
        const params: TransportRequestParams = {
          method: 'POST',
          path: `/_${apiName}`,
          meta: { name: apiName, acceptedParams: queryAcceptedParams },
          body: 'header\nbody\n',
        };

        onRequest({ scoped: true }, params, {});

        expect(params.body).toBe('header\nbody\n');
      });

      it.each(['msearch', 'msearch_template'])(
        'preserves existing querystring params when injecting for %s',
        (apiName) => {
          const params: TransportRequestParams = {
            method: 'POST',
            path: `/_${apiName}`,
            meta: { name: apiName, acceptedParams: queryAcceptedParams },
            body: 'header\nbody\n',
            querystring: { max_concurrent_searches: 5 },
          };

          onRequest({ scoped: true }, params, {});

          expect(params.querystring).toEqual({
            max_concurrent_searches: 5,
            project_routing: PROJECT_ROUTING_ORIGIN,
          });
        }
      );
    });

    describe('backward compatibility: flat-array acceptedParams (legacy / transport.request() callers)', () => {
      const onRequest = getCpsRequestHandler(true, PROJECT_ROUTING_ORIGIN);

      it('injects project_routing into body when acceptedParams is a flat array', () => {
        const params: TransportRequestParams = {
          method: 'GET',
          path: '/_search',
          meta: { name: 'search', acceptedParams: ['project_routing'] },
          body: { query: { match_all: {} } },
        };

        onRequest({ scoped: true }, params, {});

        expect((params.body as Record<string, unknown>)?.project_routing).toBe(
          PROJECT_ROUTING_ORIGIN
        );
      });

      it('does not inject when project_routing is absent from the flat array', () => {
        const params: TransportRequestParams = {
          method: 'GET',
          path: '/_cat/indices',
          meta: { name: 'cat/indices', acceptedParams: [] },
        };

        onRequest({ scoped: true }, params, {});

        expect(params.body).toBeUndefined();
      });
    });
  });

  describe('when CPS is disabled', () => {
    const onRequest = getCpsRequestHandler(false, PROJECT_ROUTING_ORIGIN);

    it('does not inject project_routing', () => {
      const params: TransportRequestParams = {
        method: 'GET',
        path: '/_search',
        meta: { name: 'search', acceptedParams: bodyAcceptedParams },
      };

      onRequest({ scoped: true }, params, {});

      expect(params.body).toBeUndefined();
    });

    it('strips project_routing from body', () => {
      const params: TransportRequestParams = {
        method: 'GET',
        path: '/_search',
        meta: { name: 'search', acceptedParams: bodyAcceptedParams },
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
        meta: { name: 'bulk', acceptedParams: noProjectRouting },
        body: { project_routing: 'should-be-stripped' },
      };

      onRequest({ scoped: true }, params, {});

      expect((params.body as Record<string, unknown>)?.project_routing).toBeUndefined();
    });

    describe('NDJSON bulk body stripping', () => {
      it.each(['msearch', 'msearch_template'])(
        'does not inject project_routing for %s',
        (apiName) => {
          const params: TransportRequestParams = {
            method: 'POST',
            path: `/_${apiName}`,
            meta: { name: apiName, acceptedParams: queryAcceptedParams },
            body: 'header\nbody\n',
          };

          onRequest({ scoped: true }, params, {});

          expect(params.querystring).toBeUndefined();
        }
      );

      it.each(['msearch', 'msearch_template'])(
        'strips project_routing from querystring for %s',
        (apiName) => {
          const params: TransportRequestParams = {
            method: 'POST',
            path: `/_${apiName}`,
            meta: { name: apiName, acceptedParams: queryAcceptedParams },
            body: 'header\nbody\n',
            querystring: { project_routing: 'should-be-removed', max_concurrent_searches: 5 },
          };

          onRequest({ scoped: true }, params, {});

          expect((params.querystring as Record<string, unknown>)?.project_routing).toBeUndefined();
          expect((params.querystring as Record<string, unknown>)?.max_concurrent_searches).toBe(5);
        }
      );

      it.each(['msearch', 'msearch_template'])(
        'does not fail when querystring is absent for %s',
        (apiName) => {
          const params: TransportRequestParams = {
            method: 'POST',
            path: `/_${apiName}`,
            meta: { name: apiName, acceptedParams: queryAcceptedParams },
            body: 'header\nbody\n',
          };

          expect(() => onRequest({ scoped: true }, params, {})).not.toThrow();
          expect(params.querystring).toBeUndefined();
        }
      );

      it('strips project_routing from each plain-object entry in bulkBody array', () => {
        const params: TransportRequestParams = {
          method: 'POST',
          path: '/_msearch',
          meta: { name: 'msearch', acceptedParams: queryAcceptedParams },
          bulkBody: [
            { index: 'my-index' },
            { query: { match_all: {} }, project_routing: 'should-be-stripped' },
            { index: 'other-index', project_routing: 'also-stripped' },
            { query: { term: { category: 'alpha' } } },
          ],
        };

        onRequest({ scoped: true }, params, {});

        expect(params).toEqual({
          method: 'POST',
          path: '/_msearch',
          meta: { name: 'msearch', acceptedParams: queryAcceptedParams },
          bulkBody: [
            { index: 'my-index' },
            { query: { match_all: {} } },
            { index: 'other-index' },
            { query: { term: { category: 'alpha' } } },
          ],
        });
      });

      it('leaves bulkBody entries without project_routing untouched', () => {
        const params: TransportRequestParams = {
          method: 'POST',
          path: '/_msearch',
          meta: { name: 'msearch', acceptedParams: queryAcceptedParams },
          bulkBody: [{ index: 'my-index' }, { query: { match_all: {} } }],
        };

        onRequest({ scoped: true }, params, {});

        expect(params).toEqual({
          method: 'POST',
          path: '/_msearch',
          meta: { name: 'msearch', acceptedParams: queryAcceptedParams },
          bulkBody: [{ index: 'my-index' }, { query: { match_all: {} } }],
        });
      });

      it('strips project_routing from a pre-serialized NDJSON string bulkBody', () => {
        const ndjson =
          JSON.stringify({ index: 'my-index', project_routing: 'should-be-stripped' }) +
          '\n' +
          JSON.stringify({ query: { match_all: {} }, project_routing: 'also-stripped' }) +
          '\n' +
          JSON.stringify({ index: 'clean' }) +
          '\n';

        const params: TransportRequestParams = {
          method: 'POST',
          path: '/_msearch',
          meta: { name: 'msearch', acceptedParams: queryAcceptedParams },
          bulkBody: ndjson,
        };

        onRequest({ scoped: true }, params, {});

        // Parse each line to assert content independent of JSON key ordering.
        const lines = (params.bulkBody as string).split('\n').filter(Boolean);
        expect(JSON.parse(lines[0])).toEqual({ index: 'my-index' });
        expect(JSON.parse(lines[1])).toEqual({ query: { match_all: {} } });
        expect(JSON.parse(lines[2])).toEqual({ index: 'clean' });
        expect(params.method).toBe('POST');
        expect(params.path).toBe('/_msearch');
      });

      it('preserves trailing newline in NDJSON string bulkBody', () => {
        const ndjson =
          JSON.stringify({ index: 'my-index', project_routing: 'x' }) +
          '\n' +
          JSON.stringify({ query: { match_all: {} } }) +
          '\n';

        const params: TransportRequestParams = {
          method: 'POST',
          path: '/_msearch',
          meta: { name: 'msearch', acceptedParams: queryAcceptedParams },
          bulkBody: ndjson,
        };

        onRequest({ scoped: true }, params, {});

        expect(params.bulkBody as string).toMatch(/\n$/);
      });

      it('does not fail when bulkBody is absent', () => {
        const params: TransportRequestParams = {
          method: 'POST',
          path: '/_msearch',
          meta: { name: 'msearch', acceptedParams: queryAcceptedParams },
        };

        expect(() => onRequest({ scoped: true }, params, {})).not.toThrow();
        expect(params).toEqual({
          method: 'POST',
          path: '/_msearch',
          meta: { name: 'msearch', acceptedParams: queryAcceptedParams },
        });
      });

      it('strips project_routing from bulkBody even without meta.name set', () => {
        // Callers using transport.request() directly may not set meta.name.
        // We still strip from bulkBody unconditionally when CPS is disabled.
        const params: TransportRequestParams = {
          method: 'POST',
          path: '/_msearch',
          bulkBody: [
            { index: 'my-index' },
            { query: { match_all: {} }, project_routing: 'should-be-stripped' },
          ],
        };

        onRequest({ scoped: true }, params, {});

        expect(params).toEqual({
          method: 'POST',
          path: '/_msearch',
          bulkBody: [{ index: 'my-index' }, { query: { match_all: {} } }],
        });
      });
    });
  });
});

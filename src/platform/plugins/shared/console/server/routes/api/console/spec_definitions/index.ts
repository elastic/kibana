/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import type { RequestHandler } from '@kbn/core/server';
import type { RouteDependencies } from '../../..';
import type { KibanaApiDocLinksMap } from '../../../../../common/types/api_responses';
import kibanaApiDocLinks from '../../../../lib/spec_definitions/kibana_api_doc_links/generated_kibana_api_doc_links.json';
import { compactSpecDefinitions } from '../../../../services/compact_spec_definitions';
import type { SpecDefinitionsJson } from '../../../../types';

interface SpecDefinitionsRouteResponse {
  es: SpecDefinitionsJson;
  kibana: {
    docLinks: KibanaApiDocLinksMap;
  };
}

interface CachedResponse {
  body: string;
  etag: string;
}

const matchesEtag = (header: string | string[] | undefined, etag: string): boolean => {
  const values = Array.isArray(header) ? header : [header];
  return values.some((value) =>
    value?.split(',').some((candidate) => {
      const normalized = candidate.trim();
      if (normalized === '*') {
        return true;
      }
      const unquoted = normalized.replace(/^W\//, '').replace(/^"(.+)"$/, '$1');
      return unquoted.split('-')[0] === etag;
    })
  );
};

export const registerSpecDefinitionsRoute = ({ router, services }: RouteDependencies) => {
  let cachedResponse: CachedResponse | undefined;
  const getCachedResponse = (): CachedResponse => {
    if (!cachedResponse) {
      const specResponse: SpecDefinitionsRouteResponse = {
        es: compactSpecDefinitions(services.specDefinitionService.asJson()),
        kibana: { docLinks: kibanaApiDocLinks },
      };
      const body = JSON.stringify(specResponse);
      cachedResponse = {
        body,
        etag: createHash('sha256').update(body).digest('hex'),
      };
    }
    return cachedResponse;
  };

  const handler: RequestHandler = async (ctx, request, response) => {
    const { body, etag } = getCachedResponse();
    const headers = {
      'cache-control': 'private, no-cache',
      'content-type': 'application/json',
      etag,
      vary: 'accept-encoding',
    };
    if (matchesEtag(request.headers['if-none-match'], etag)) {
      return response.notModified({ headers });
    }
    return response.ok({ body, headers });
  };

  router.get(
    {
      path: '/api/console/api_server',
      security: {
        authz: {
          enabled: false,
          reason: 'Low effort request for config info',
        },
      },
      validate: false,
    },
    handler
  );
};

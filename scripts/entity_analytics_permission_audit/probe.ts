/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Persona, EndpointId, PrivilegeResponse, ApiProbeResult } from './types';
import { personaFetch } from './api';
import { PRIVILEGE_ENDPOINT_PATHS, buildEndpointUrl, buildSpacePath } from './endpoints';

const ENDPOINT_IDS = Object.keys(PRIVILEGE_ENDPOINT_PATHS) as EndpointId[];

export const probeAllPersonas = async (
  kibanaUrl: string,
  space: string,
  personas: Persona[]
): Promise<ApiProbeResult[]> => {
  const spacePath = buildSpacePath(space);
  const results: ApiProbeResult[] = [];

  for (const persona of personas) {
    for (const endpointId of ENDPOINT_IDS) {
      const url = buildEndpointUrl(kibanaUrl, spacePath, PRIVILEGE_ENDPOINT_PATHS[endpointId]);
      let response: PrivilegeResponse | null = null;
      let error: string | undefined;

      try {
        response = (await personaFetch(
          url,
          persona.username,
          persona.password
        )) as PrivilegeResponse;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }

      results.push({ personaId: persona.id, endpointId, response, error });
    }
    process.stdout.write('.');
  }
  process.stdout.write('\n');

  return results;
};

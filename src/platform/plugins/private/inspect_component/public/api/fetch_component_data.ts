/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';

/**
 * Parameters for {@link fetchComponentData}.
 */
interface FetchComponentDataOptions {
  /** Kibana HTTP service. */
  httpService: CoreStart['http'];
  /** Full component path. */
  fileName: string;
}

/**
 * Response type for POST "/internal/inspect_component/inspect" route.
 */
export interface InspectComponentResponse {
  /** List of all teams who are codeowners for the specified file. */
  codeowners: string[];
  /** File path relative to the repository root. */
  relativePath: string;
  /** File name with extension. */
  baseFileName: string;
}

/**
 * Fetch component data.
 * @async
 * @param {CoreStart['http']} httpService Kibana HTTP service.
 * @param {string} fileName Full component path.
 * @returns {Promise<InspectComponentResponse|undefined>} Resolves with component data or undefined if an error occurs.
 */
export const fetchComponentData = async ({
  httpService,
  fileName,
}: FetchComponentDataOptions): Promise<InspectComponentResponse | undefined> => {
  try {
    const response: InspectComponentResponse = await httpService.post(
      '/internal/inspect_component/inspect',
      {
        body: JSON.stringify({ path: fileName }),
      }
    );

    return response;
  } catch (e) {
    return undefined;
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../constants';
import type { ConnectorSpecResponse, ConnectorSpecWireResponse } from '../fetch_connector_spec';
import { transformConnectorSpecResponse } from '../fetch_connector_spec';

export interface BrowserGetSpecParams {
  id: string;
  signal?: AbortSignal;
}

export interface SpecsClient {
  get(params: BrowserGetSpecParams): Promise<ConnectorSpecResponse>;
}

export const createSpecsClient = ({ http }: { http: HttpSetup }): SpecsClient => ({
  async get({ id, signal }) {
    const wire = await http.get<ConnectorSpecWireResponse>(
      `${INTERNAL_BASE_ACTION_API_PATH}/connector_types/${encodeURIComponent(id)}/spec`,
      { signal }
    );
    return transformConnectorSpecResponse(wire);
  },
});

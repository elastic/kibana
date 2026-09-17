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
import {
  transformConnectorSpecsResponse,
  type ConnectorSpecCatalogEntry,
  type ConnectorSpecCatalogWireResponse,
} from './transform_connector_specs_response';

export const fetchConnectorSpecs = async ({
  http,
}: {
  http: HttpSetup;
}): Promise<ConnectorSpecCatalogEntry[]> => {
  const wire = await http.get<ConnectorSpecCatalogWireResponse>(
    `${INTERNAL_BASE_ACTION_API_PATH}/connector_types/specs`
  );
  return transformConnectorSpecsResponse(wire);
};

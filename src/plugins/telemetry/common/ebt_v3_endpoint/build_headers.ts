/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { BuildShipperHeaders } from '@elastic/ebt/shippers/elastic_v3/common';

/**
 * Returns the headers to send to the Remote Telemetry Service.
 * @param clusterUuid The UUID of the ES cluster.
 * @param version The version of the ES cluster.
 * @param licenseId The ID of the license (if available).
 */
export const buildShipperHeaders: BuildShipperHeaders = (
  clusterUuid: string,
  version: string,
  licenseId?: string
) => {
  return {
    'content-type': 'application/x-ndjson',
    'x-elastic-cluster-id': clusterUuid,
    'x-elastic-stack-version': version,
    ...(licenseId && { 'x-elastic-license-id': licenseId }),
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  BuildShipperUrlOptions,
  BuildShipperUrl,
} from '@elastic/ebt/shippers/elastic_v3/common';

/**
 * Builds the URL for the V3 API.
 */
export const createBuildShipperUrl =
  (sendTo: 'production' | 'staging'): BuildShipperUrl =>
  (urlOptions: BuildShipperUrlOptions): string => {
    const { channelName } = urlOptions;
    const baseUrl =
      sendTo === 'production'
        ? 'https://telemetry.elastic.co'
        : 'https://telemetry-staging.elastic.co';
    return `${baseUrl}/v3/send/${channelName}`;
  };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as EsErrors } from '@elastic/elasticsearch';

const retryResponseStatuses = [
  401, // AuthorizationException
  403, // AuthenticationException
  408, // RequestTimeout
  410, // Gone
  429, // TooManyRequests -> ES circuit breaker
  503, // ServiceUnavailable
  504, // GatewayTimeout
];

/**
 * Returns true if the given elasticsearch error should be retried
 * by retry-based resiliency systems such as the SO migration, false otherwise.
 */
export const isRetryableEsClientError = (e: EsErrors.ElasticsearchClientError): boolean => {
  if (
    e instanceof EsErrors.NoLivingConnectionsError ||
    e instanceof EsErrors.ConnectionError ||
    e instanceof EsErrors.TimeoutError ||
    (e instanceof EsErrors.ResponseError &&
      (retryResponseStatuses.includes(e?.statusCode!) ||
        // Our proxy may return 404 error with "Unknown resource" while resources are being created, we want to retry these errors. Ideally, the proxy would return 503s. See original issue https://github.com/elastic/kibana/issues/199502
        (e?.statusCode === 404 && e?.body?.message === 'Unknown resource.') ||
        // ES returns a 400 Bad Request when trying to close or delete an
        // index while snapshots are in progress. This should have been a 503
        // so once https://github.com/elastic/elasticsearch/issues/65883 is
        // fixed we can remove this.
        e?.body?.error?.type === 'snapshot_in_progress_exception'))
  ) {
    return true;
  }
  return false;
};

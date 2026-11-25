/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { ILicense } from '@kbn/licensing-types';

const INFERENCE_CONNECTORS_ROUTE = '/internal/inference/connectors';

/** How long a connectors lookup that found one is reused before the connectors are looked up again. */
export const INFERENCE_CONNECTORS_CACHE_MS = 60 * 1000;

export interface NlToEsqlAvailability {
  hasEnterpriseLicense: () => Promise<boolean>;
  hasInferenceConnector: () => Promise<boolean>;
}

/**
 * Creates the checks that gate natural language to ES|QL. The license is cached for the session,
 * unless its lookup fails. Connectors can be added at any time, so a connectors lookup is shared
 * while it runs and reused afterwards only when it found one, for a minute.
 */
export const createNlToEsqlAvailability = (
  getLicense: () => Promise<ILicense | undefined>,
  http: HttpStart
): NlToEsqlAvailability => {
  let enterpriseLicenseRequest: Promise<boolean> | undefined;
  let inferenceConnectorRequest: Promise<boolean> | undefined;
  let inferenceConnectorExpiresAt = 0;

  return {
    hasEnterpriseLicense: () =>
      (enterpriseLicenseRequest ??= getLicense()
        .then((license) =>
          Boolean(license && license.status === 'active' && license.hasAtLeast('enterprise'))
        )
        .catch(() => {
          enterpriseLicenseRequest = undefined;
          return false;
        })),
    hasInferenceConnector: () => {
      if (!inferenceConnectorRequest || Date.now() >= inferenceConnectorExpiresAt) {
        inferenceConnectorExpiresAt = Infinity;
        inferenceConnectorRequest = http
          .get<{ connectors: unknown[] }>(INFERENCE_CONNECTORS_ROUTE)
          .then((res) => res.connectors.length > 0)
          // A failed request or an unexpected response both count as no connector
          .catch(() => false)
          .then((hasConnector) => {
            inferenceConnectorExpiresAt = hasConnector
              ? Date.now() + INFERENCE_CONNECTORS_CACHE_MS
              : 0;
            return hasConnector;
          });
      }
      return inferenceConnectorRequest;
    },
  };
};

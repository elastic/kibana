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

export interface NlToEsqlAvailability {
  hasEnterpriseLicense: () => Promise<boolean>;
  hasInferenceConnector: () => Promise<boolean>;
}

/** Creates the checks that gate natural language to ES|QL, each cached for the session. */
export const createNlToEsqlAvailability = (
  getLicense: () => Promise<ILicense | undefined>,
  http: HttpStart
): NlToEsqlAvailability => {
  let enterpriseLicenseRequest: Promise<boolean> | undefined;
  let inferenceConnectorRequest: Promise<boolean> | undefined;

  return {
    hasEnterpriseLicense: () =>
      (enterpriseLicenseRequest ??= getLicense()
        .then((license) =>
          Boolean(license && license.status === 'active' && license.hasAtLeast('enterprise'))
        )
        .catch(() => false)),
    hasInferenceConnector: () =>
      (inferenceConnectorRequest ??= http
        .get<{ connectors: unknown[] }>(INFERENCE_CONNECTORS_ROUTE)
        .then((res) => res.connectors.length > 0)
        .catch(() => false)),
  };
};

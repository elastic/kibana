/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CustomIntegration } from '../../common';

interface FindParams {
  eprPackageName?: string;
  shipper?: string;
}

/**
 * A plugin service that finds and returns custom integrations.
 */
export interface CustomIntegrationsFindService {
  findReplacementIntegrations(params?: FindParams): Promise<CustomIntegration[]>;
  findAppendedIntegrations(params?: FindParams): Promise<CustomIntegration[]>;
}

/**
 * Filter a set of integrations by eprPackageName, and/or shipper.
 */
export const filterCustomIntegrations = (
  integrations: CustomIntegration[],
  { eprPackageName, shipper }: FindParams = {}
) => {
  if (!eprPackageName && !shipper) {
    return integrations;
  }

  let result = integrations;

  if (eprPackageName) {
    result = result.filter((integration) => integration.eprOverlap === eprPackageName);
  }

  if (shipper) {
    result = result.filter((integration) => integration.shipper === shipper);
  }

  return result;
};

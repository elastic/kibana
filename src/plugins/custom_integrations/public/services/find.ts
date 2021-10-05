/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomIntegration, IntegrationCategory } from '../../common';

interface FindParams {
  categories?: IntegrationCategory[];
  eprOverlap?: string;
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
 * Filter a set of integrations by category, eprOverlap, and/or shipper.
 */
export const filterCustomIntegrations = (
  integrations: CustomIntegration[],
  { categories = [], eprOverlap, shipper }: FindParams = {}
) => {
  if (categories.length === 0 && !eprOverlap && !shipper) {
    return integrations;
  }

  let result = integrations;

  if (categories.length > 0) {
    result = result.filter((integration) =>
      categories.every((category) => integration.categories.includes(category))
    );
  }

  if (eprOverlap) {
    result = result.filter((integration) => integration.eprOverlap === eprOverlap);
  }

  if (shipper) {
    result = result.filter((integration) => integration.shipper === shipper);
  }

  return result;
};

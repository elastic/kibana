/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  MetricsExperiencePluginStart,
  MetricsExperienceClient,
} from '@kbn/metrics-experience-plugin/public';

export interface MetricsContextService {
  getMetricsExperienceClient(): MetricsExperienceClient | undefined;
}

export interface MetricsContextServiceDeps {
  metricsExperience?: MetricsExperiencePluginStart;
}

export const createMetricsContextService = async ({
  metricsExperience,
}: MetricsContextServiceDeps): Promise<MetricsContextService> => {
  if (!metricsExperience) {
    return getMetricsContextService({ metricsExperienceClient: undefined });
  }

  return getMetricsContextService({
    metricsExperienceClient: metricsExperience.metricsExperienceClient,
  });
};

export const getMetricsContextService = ({
  metricsExperienceClient,
}: {
  metricsExperienceClient: MetricsExperienceClient | undefined;
}) => {
  return {
    getMetricsExperienceClient: () => metricsExperienceClient,
  };
};

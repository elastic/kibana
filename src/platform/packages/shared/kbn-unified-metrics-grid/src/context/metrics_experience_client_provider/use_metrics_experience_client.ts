/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContext } from 'react';
import { MetricsExperienceClientContext } from './metrics_experience_client_provider';

export function useMetricsExperienceClient() {
  const services = useContext(MetricsExperienceClientContext);

  if (!services) {
    throw new Error(
      'MetricsExperienceContext not set. Did you wrap your component in `<MetricsExperienceProvider/>`?'
    );
  }

  return services;
}

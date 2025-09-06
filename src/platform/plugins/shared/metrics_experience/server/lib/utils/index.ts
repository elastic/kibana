/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { AwaitedProperties } from '@kbn/utility-types';
import type { RequestHandlerContext } from '@kbn/core/server';
import { notFound } from '@hapi/boom';
import { METRICS_EXPERIENCE_FEATURE_FLAG_KEY } from '../../../common/constants';

export const throwNotFoundIfMetricsExperienceDisabled = async (
  services: AwaitedProperties<Pick<RequestHandlerContext, 'core'>>
) => {
  const isEnabled = await services.core.featureFlags.getBooleanValue(
    METRICS_EXPERIENCE_FEATURE_FLAG_KEY,
    false
  );

  if (!isEnabled) {
    throw notFound();
  }
};

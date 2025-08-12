/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverServices } from '../../../build_services';

export const getUserAndSpaceIds = async (services: DiscoverServices) => {
  let userId = '';
  let spaceId = '';

  try {
    userId = (await services.core.security?.authc.getCurrentUser()).profile_uid ?? '';
  } catch {
    // ignore as user id might be unavailable for some deployments
  }

  try {
    spaceId = (await services.spaces?.getActiveSpace())?.id ?? '';
  } catch {
    // ignore
  }

  return { userId, spaceId };
};

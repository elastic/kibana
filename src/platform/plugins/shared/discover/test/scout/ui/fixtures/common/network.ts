/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

export const countMatchingRequests = async (
  page: ScoutPage,
  endpoint: string,
  action: () => Promise<void>
): Promise<number> => {
  let count = 0;
  const listener = (request: { url: () => string }) => {
    if (request.url().includes(endpoint)) {
      count++;
    }
  };

  page.on('request', listener);
  try {
    await action();
  } finally {
    page.off('request', listener);
  }

  return count;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { createServicesMock } from '@kbn/unified-data-table/__mocks__/services';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';

export const createTanStackDataTableServicesMock = (): UnifiedDataTableProps['services'] => {
  const services = createServicesMock();
  return {
    ...services,
    storage: new Storage(window.localStorage),
  };
};

export const servicesMock = createTanStackDataTableServicesMock();

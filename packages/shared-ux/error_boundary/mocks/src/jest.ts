/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaErrorService } from '../../src/services/error_service';
import { KibanaErrorBoundaryServices } from '../../types';

export const getServicesMock = (): KibanaErrorBoundaryServices => {
  const mockDeps = {
    analytics: { reportEvent: jest.fn() },
  };
  return {
    onClickRefresh: jest.fn().mockResolvedValue(undefined),
    errorService: new KibanaErrorService(mockDeps),
  };
};

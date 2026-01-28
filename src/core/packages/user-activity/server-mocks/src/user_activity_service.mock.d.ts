/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  UserActivityServiceSetup,
  UserActivityServiceStart,
} from '@kbn/core-user-activity-server';
import type {
  InternalUserActivityServiceSetup,
  InternalUserActivityServiceStart,
} from '@kbn/core-user-activity-server-internal';
export declare const userActivityServiceMock: {
  createInternalSetupContract: () => jest.Mocked<InternalUserActivityServiceSetup>;
  createInternalStartContract: () => jest.Mocked<InternalUserActivityServiceStart>;
  createSetupContract: () => jest.Mocked<UserActivityServiceSetup>;
  createStartContract: () => jest.Mocked<UserActivityServiceStart>;
};

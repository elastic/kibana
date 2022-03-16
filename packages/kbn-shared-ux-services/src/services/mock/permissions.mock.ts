/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServiceFactory } from '../../types';
import type { SharedUxUserPermissionsService } from '../permissions';

/**
 * A factory function for creating a Jest-based implementation of `SharedUxUserPermissionsService`.
 */
export type MockUserPermissionsServiceFactory = ServiceFactory<SharedUxUserPermissionsService>;

/**
 * A factory function for creating a Jest-based implementation of `SharedUxUserPermissionsService`.
 */
export const userPermissionsServiceFactory: MockUserPermissionsServiceFactory = () => ({
  canCreateNewDataView: true,
  canAccessFleet: true,
});

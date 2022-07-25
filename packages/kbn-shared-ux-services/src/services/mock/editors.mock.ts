/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServiceFactory } from '../../types';
import type { SharedUxEditorsService } from '../editors';

/**
 * A factory function for creating a Jest-based implementation of `SharedUxEditorsService`.
 */
export type MockEditorsServiceFactory = ServiceFactory<SharedUxEditorsService>;

/**
 * A factory function for creating a Jest-based implementation of `SharedUxEditorsService`.
 */
export const editorsServiceFactory: MockEditorsServiceFactory = () => ({
  openDataViewEditor: jest.fn(),
});

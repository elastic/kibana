/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ServiceFactory } from '../../types';
import { SharedUxDataService } from '../data';

/**
 * A factory function for creating a simple stubbed implementation of `SharedUxDataSevice`.
 */
export type DataServiceFactory = ServiceFactory<SharedUxDataService>;

/**
 * A factory function for creating a simple stubbed implementation of `SharedUxDataSevice`.
 */
export const dataServiceFactory: DataServiceFactory = () => ({
  hasESData: () => Promise.resolve(true),
  hasDataView: () => Promise.resolve(false),
  hasUserDataView: () => Promise.resolve(false),
});

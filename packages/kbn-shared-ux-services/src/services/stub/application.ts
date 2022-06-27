/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { ServiceFactory } from '../../types';
import { SharedUxApplicationService } from '../application';

export type ApplicationServiceFactory = ServiceFactory<SharedUxApplicationService>;

/**
 * A factory function for creating for creating a simple stubbed implementation of `SharedUXApplicationService`.
 */
export const applicationServiceFactory: ApplicationServiceFactory = () => ({
  navigateToUrl: (url) => {
    // eslint-disable-next-line no-console
    console.log(url);
    return Promise.resolve();
  },
  currentAppId$: new Observable((subscriber) => {
    subscriber.next('123');
  }),
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SharedUxServices, ServiceFactory } from '../../types';

import { applicationServiceFactory } from './application';
import { docLinksServiceFactory } from './doc_links';
import { editorsServiceFactory } from './editors';
import { httpServiceFactory } from './http';
import { platformServiceFactory } from './platform';
import { userPermissionsServiceFactory } from './permissions';

/**
 * A factory function for creating simple stubbed implementations of all `SharedUxServices`.
 */
export const stubServicesFactory: ServiceFactory<SharedUxServices> = () => ({
  application: applicationServiceFactory(),
  docLinks: docLinksServiceFactory(),
  editors: editorsServiceFactory(),
  http: httpServiceFactory(),
  permissions: userPermissionsServiceFactory(),
  platform: platformServiceFactory(),
});

/**
 * A collection of stubbed service factories.
 */
export const stubServiceFactories = {
  applicationServiceFactory,
  docLinksServiceFactory,
  editorsServiceFactory,
  httpServiceFactory,
  platformServiceFactory,
  userPermissionsServiceFactory,
};

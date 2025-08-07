/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Newable, ServiceIdentifier } from 'inversify';
import type { App, AppMount, AppMountParameters } from '@kbn/core-application-browser';

/**
 * The browser application definition.
 * @public
 */
export interface ApplicationDefinition<HistoryLocationState = unknown>
  extends Omit<App<HistoryLocationState>, 'mount'>,
    Newable<ApplicationHandler<HistoryLocationState>> {}

/**
 * The browser application mount handler.
 * @public
 */
export interface ApplicationHandler<HistoryLocationState = unknown> {
  /**
   * The mount function that will be called when the application is mounted.
   * The mount parameters can be injected using {@link ApplicationParameters}.
   */
  mount(): ReturnType<AppMount<HistoryLocationState>>;
}

/**
 * The service identifier that is used to register the application.
 * @public
 */
export const Application: ServiceIdentifier<
  ApplicationDefinition & Exclude<ServiceIdentifier<ApplicationHandler>, keyof any>
> = Symbol.for('Application');

/**
 * The service identifier of the application mount parameters.
 * @public
 */
export const ApplicationParameters: ServiceIdentifier<AppMountParameters> =
  Symbol.for('ApplicationParameters');

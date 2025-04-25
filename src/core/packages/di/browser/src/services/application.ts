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

interface ApplicationDefinition<HistoryLocationState = unknown>
  extends Omit<App<HistoryLocationState>, 'mount'>,
    Newable<ApplicationHandler<HistoryLocationState>> {}

interface ApplicationHandler<HistoryLocationState = unknown> {
  mount(): ReturnType<AppMount<HistoryLocationState>>;
}

export const Application: ServiceIdentifier<
  ApplicationDefinition & Exclude<ServiceIdentifier<ApplicationHandler>, keyof any>
> = Symbol.for('Application');

export const ApplicationParameters: ServiceIdentifier<AppMountParameters> =
  Symbol.for('ApplicationParameters');

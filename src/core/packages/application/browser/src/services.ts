/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { interfaces } from 'inversify';
import type { App } from './application';
import type { AppMount, AppMountParameters } from './app_mount';
import type { ApplicationSetup } from './contracts';

export interface ApplicationDefinition<HistoryLocationState = unknown>
  extends Omit<App<HistoryLocationState>, 'mount'>,
    interfaces.Newable<IAppMount<HistoryLocationState>> {}

export interface IAppMount<HistoryLocationState = unknown> {
  mount(): ReturnType<AppMount<HistoryLocationState>>;
}

export const Application: interfaces.ServiceIdentifier<
  ApplicationDefinition & Exclude<interfaces.ServiceIdentifier<IAppMount>, keyof any>
> = Symbol.for('Application');

export const ApplicationService: interfaces.ServiceIdentifier<ApplicationSetup> =
  Symbol.for('ApplicationService');

export const AppMountParametersToken: interfaces.ServiceIdentifier<AppMountParameters> =
  Symbol.for('AppMountParameters');

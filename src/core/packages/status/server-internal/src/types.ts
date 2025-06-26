/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';
import type { PluginName } from '@kbn/core-base-common';
import type { ServiceStatus } from '@kbn/core-status-common';
import type { StatusServiceSetup } from '@kbn/core-status-server';

/** @internal */
export interface InternalStatusServiceSetup
  extends Pick<StatusServiceSetup, 'core$' | 'overall$' | 'isStatusPageAnonymous'> {
  /**
   * Overall status of core's service.
   */
  coreOverall$: Observable<ServiceStatus>;

  // Namespaced under `plugins` key to improve clarity that these are APIs for plugins specifically.
  plugins: {
    set(plugin: PluginName, status$: Observable<ServiceStatus>): void;
    getDependenciesStatus$(plugin: PluginName): Observable<Record<string, ServiceStatus>>;
    getDerivedStatus$(plugin: PluginName): Observable<ServiceStatus>;
  };
}

/** @internal */
export interface NamedStatus extends ServiceStatus {
  name: string; // the name of the service / plugin
}

/** @internal */
export interface NamedServiceStatus extends ServiceStatus, NamedStatus {}

/** @internal */
export interface LoggableServiceStatus extends NamedServiceStatus {
  repeats?: number; // whether this status has been reported repeatedly recently (and how many times)
}

/** @internal */
export interface PluginStatus extends ServiceStatus {
  reported?: boolean; // whether this status is reported (true) or inferred (false)
}

/** @internal */
export interface NamedPluginStatus extends PluginStatus, NamedStatus {}

/** @internal */
export interface LoggablePluginStatus extends PluginStatus, LoggableServiceStatus {}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

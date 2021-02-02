/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { CoreStart, AppUpdater } from 'src/core/public';

/**
 * A factory function for creating a service.
 *
 * The `Service` generic determines the shape of the API being produced.
 * The `StartParameters` generic determines what parameters are expected to
 * create the service.
 */
export type PluginServiceFactory<Service, Parameters = {}> = (params: Parameters) => Service;

/**
 * Parameters necessary to create a Kibana-based service, (e.g. during Plugin
 * startup or setup).
 *
 * The `Start` generic refers to the specific Plugin `TPluginsStart`.
 */
export interface KibanaPluginServiceParams<Start extends {}> {
  coreStart: CoreStart;
  startPlugins: Start;
  appUpdater?: BehaviorSubject<AppUpdater>;
}

/**
 * A factory function for creating a Kibana-based service.
 *
 * The `Service` generic determines the shape of the API being produced.
 * The `Setup` generic refers to the specific Plugin `TPluginsSetup`.
 * The `Start` generic refers to the specific Plugin `TPluginsStart`.
 */
export type KibanaPluginServiceFactory<Service, Start extends {}> = (
  params: KibanaPluginServiceParams<Start>
) => Service;

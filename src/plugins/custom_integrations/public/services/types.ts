/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from 'src/core/public';

/**
 * Parameters necessary to create a Kibana-based service, (e.g. during Plugin
 * startup or setup).
 *
 * The `Start` generic refers to the specific Plugin `TPluginsStart`.
 */
export interface KibanaPluginServiceParams<Start extends {}> {
  coreStart: CoreStart;
  startPlugins: Start;
}

/**
 * A factory function for creating a Kibana-based service.
 *
 * The `Service` generic determines the shape of the Service being produced.
 * The `Start` generic refers to the specific Plugin `TPluginsStart`.
 */
export type KibanaPluginServiceFactory<Service, Start extends {}> = (
  params: KibanaPluginServiceParams<Start>
) => Service;

/**
 * A factory function for creating a stubbed service
 */
export type PluginServiceFactory<Service, Params extends {} = {}> = (params: Params) => Service;

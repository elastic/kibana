/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FC } from 'react';

import {
  SharedUxApplicationService,
  SharedUxDocLinksService,
  SharedUxEditorsService,
  SharedUxHttpService,
  SharedUxPlatformService,
  SharedUxUserPermissionsService,
} from './services';

/**
 * A collection of services utilized by SharedUX.  This serves as a thin
 * abstraction layer between services provided by Kibana and other plugins
 * while allowing this plugin to be developed independently of those contracts.
 *
 * It also allows us to "swap out" differenct implementations of these services
 * for different environments, (e.g. Jest, Storybook, etc.)
 */
export interface SharedUxServices {
  application: SharedUxApplicationService;
  docLinks: SharedUxDocLinksService;
  editors: SharedUxEditorsService;
  http: SharedUxHttpService;
  permissions: SharedUxUserPermissionsService;
  platform: SharedUxPlatformService;
}

/**
 * A type representing a component that provides the `SharedUxServices` through a
 * React Context.
 */
export type SharedUxServicesContext = FC<{}>;

/**
 * A factory function for creating one or more services.
 *
 * The `S` generic determines the shape of the API being produced.
 * The `Parameters` generic determines what parameters are expected to
 * create the service.
 */
export type ServiceFactory<S, Parameters = void> = (params: Parameters) => S;

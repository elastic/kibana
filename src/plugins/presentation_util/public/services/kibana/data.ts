/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PresentationUtilPluginStartDeps } from '../../types';
import { KibanaPluginServiceFactory } from '../create';
import { PresentationDataService } from '../data';

export type DataServiceFactory = KibanaPluginServiceFactory<
  PresentationDataService,
  PresentationUtilPluginStartDeps
>;

export const dataServiceFactory: DataServiceFactory = ({ startPlugins }) => {
  const {
    data: { autocomplete },
  } = startPlugins;
  return {
    autocomplete,
  };
};

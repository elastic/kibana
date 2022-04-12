/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlsUnifiedSearchService } from '../unified_search';
import { ControlsPluginStartDeps } from '../../types';
import { KibanaPluginServiceFactory } from '../../../../presentation_util/public';

export type UnifiedSearchServiceFactory = KibanaPluginServiceFactory<
  ControlsUnifiedSearchService,
  ControlsPluginStartDeps
>;

export const unifiedSearchServiceFactory: UnifiedSearchServiceFactory = ({ startPlugins }) => {
  const {
    unifiedSearch: { autocomplete },
  } = startPlugins;

  return {
    autocomplete,
  };
};

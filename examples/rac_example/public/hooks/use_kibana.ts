/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '../../../../src/core/public';
import {
  createKibanaReactContext,
  KibanaReactContextValue,
  useKibana,
} from '../../../../src/plugins/kibana_react/public';
import { RacExampleClientStartDeps } from '../types';

export type PluginKibanaContextValue = CoreStart & RacExampleClientStartDeps;

export const createKibanaContextForPlugin = (
  core: CoreStart,
  pluginsStart: RacExampleClientStartDeps
) =>
  createKibanaReactContext<PluginKibanaContextValue>({
    ...core,
    ...pluginsStart,
  });

export const useKibanaContextForPlugin =
  useKibana as () => KibanaReactContextValue<PluginKibanaContextValue>;

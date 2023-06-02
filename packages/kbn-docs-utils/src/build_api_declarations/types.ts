/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { ApiScope, PluginOrPackage } from '../types';

export interface BuildApiDecOpts {
  plugins: PluginOrPackage[];
  log: ToolingLog;
  currentPluginId: string;
  /**
   * Whether or not to collect references. This can take a very long time so it can be turned on only for a single plugin.
   */
  captureReferences: boolean;
  /**
   * User facing name of the API item.
   */
  name: string;
  /**
   * What scope the API Item is defined in (common, server, or public)
   */
  scope: ApiScope;
  /**
   * Unique id of this API item.
   */
  id: string;
}

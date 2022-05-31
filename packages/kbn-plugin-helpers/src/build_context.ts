/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';

import { Plugin } from './load_kibana_platform_plugin';
import { Config } from './config';

export interface BuildContext {
  log: ToolingLog;
  plugin: Plugin;
  config: Config;
  sourceDir: string;
  buildDir: string;
  kibanaVersion: string;
}

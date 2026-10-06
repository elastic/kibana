/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { PluginDiscoveryError } from './plugin_discovery_error';
/**
 * Recursively iterates over every plugin search path and returns a merged stream of all
 * sub-directories containing a manifest file. If directory cannot be read or it's impossible to get stat
 * for any of the nested entries then error is added into the stream instead.
 *
 * @param pluginDirs List of the top-level directories to process.
 * @param log Plugin discovery logger instance.
 */
export declare function scanPluginSearchPaths(
  pluginDirs: readonly string[],
  log: Logger
): Observable<string | PluginDiscoveryError>;

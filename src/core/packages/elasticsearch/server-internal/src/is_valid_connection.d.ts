/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { NodesVersionCompatibility } from './version_check/ensure_es_version';
/**
 * Validates the output of the ES Compatibility Check and waits for a valid connection.
 * It may also throw on specific config/connection errors to make Kibana halt.
 *
 * @param esNodesCompatibility$ ES Compatibility Check's observable
 *
 * @remarks: Ideally, this will be called during the start lifecycle to figure
 * out any configuration issue as soon as possible.
 */
export declare function isValidConnection(
  esNodesCompatibility$: Observable<NodesVersionCompatibility>
): Promise<NodesVersionCompatibility>;

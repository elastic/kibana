/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { ServiceStatus } from '@kbn/core-status-common';
import type { ElasticsearchStatusMeta } from './types';
import type { NodesVersionCompatibility } from './version_check/ensure_es_version';
export declare const calculateStatus$: (
  esNodesCompatibility$: Observable<NodesVersionCompatibility>
) => Observable<ServiceStatus<ElasticsearchStatusMeta>>;

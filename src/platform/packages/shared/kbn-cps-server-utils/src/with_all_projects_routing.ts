/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PROJECT_ROUTING_ALL } from './constants';

/**
 * Prefixes an ES|QL query with `SET project_routing` across every CPS-linked project.
 *
 * Alerting v2 still injects space routing on the request body, and Elasticsearch prefers
 * the in-query SET (`default < body < SET`). Apply only when CPS is enabled: Elasticsearch
 * rejects the setting otherwise. The directive is baked into the stored rule, so rules
 * written with a different CPS state must be re-synced (or recreated) to pick up the change.
 */
export const withAllProjectsRouting = (query: string): string =>
  `SET project_routing="${PROJECT_ROUTING_ALL}";\n${query}`;

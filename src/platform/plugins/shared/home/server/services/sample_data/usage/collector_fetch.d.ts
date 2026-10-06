/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type moment from 'moment';
import type { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
export interface TelemetryResponse {
  installed: string[];
  uninstalled: string[];
  last_install_date: moment.Moment | null;
  last_install_set: string | null;
  last_uninstall_date: moment.Moment | null;
  last_uninstall_set: string | null;
}
export declare function fetchProvider(
  getIndexForType: (type: string) => Promise<string>
): ({ esClient }: CollectorFetchContext) => Promise<any>;

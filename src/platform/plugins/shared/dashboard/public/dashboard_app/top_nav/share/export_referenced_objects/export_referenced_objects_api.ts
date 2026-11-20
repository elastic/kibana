/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExportReferencedObjectsResponse } from '@kbn/saved-objects-management-plugin/common';
import { downloadFileAs } from '@kbn/share-plugin/public';

import { DASHBOARD_API_PATH, DASHBOARD_API_VERSION } from '../../../../../common/constants';
import { coreServices } from '../../../../services/kibana_services';

export const exportDashboards = (ids: string[]) =>
  coreServices.http.post<ExportReferencedObjectsResponse>(`${DASHBOARD_API_PATH}/_export`, {
    version: DASHBOARD_API_VERSION,
    body: JSON.stringify({ ids }),
  });

export const downloadExport = (filename: string, content: string) =>
  downloadFileAs(filename, { content, type: 'application/json' });

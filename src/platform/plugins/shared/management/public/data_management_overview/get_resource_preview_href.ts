/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { DataManagementResource } from './sample_resources';

type GetUrlForApp = ApplicationStart['getUrlForApp'];

/**
 * Href for the resource's existing preview. Empty when that type has no page or flyout of its own.
 */
export const getResourcePreviewHref = (
  getUrlForApp: GetUrlForApp,
  resource: DataManagementResource
): string => {
  const name = encodeURIComponent(resource.title);

  switch (resource.kind) {
    case 'index':
      return getUrlForApp('management', {
        path: `/data/index_management/indices/index_details?indexName=${name}`,
      });
    case 'dataStream':
      return getUrlForApp('management', {
        path: `/data/index_management/data_streams/${name}`,
      });
    case 'stream':
      return getUrlForApp('streams', {
        path: `/${name}/management/overview`,
      });
    case 'esqlView':
    case 'dataset':
      return '';
  }
};

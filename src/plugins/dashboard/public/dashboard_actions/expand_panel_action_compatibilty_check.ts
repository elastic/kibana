/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiCanExpandPanels, type CanExpandPanels } from '@kbn/presentation-containers';
import {
  apiHasParentApi,
  apiHasUniqueId,
  type HasParentApi,
  type HasUniqueId,
} from '@kbn/presentation-publishing';
import { getDashboardCapabilities } from '../utils/get_dashboard_capabilities';

export type ExpandPanelActionApi = HasUniqueId & HasParentApi<CanExpandPanels>;

export const compatibilityCheck = (api: unknown): api is ExpandPanelActionApi => {
  return Boolean(apiHasUniqueId(api) && apiHasParentApi(api) && apiCanExpandPanels(api.parentApi));
};

export function isCompatible(api: unknown) {
  if (!compatibilityCheck(api)) return false;
  const { createNew: canCreateNew, showWriteControls: canEditExisting } =
    getDashboardCapabilities();
  return Boolean(canCreateNew || canEditExisting);
}

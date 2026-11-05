/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isDashboardPanel } from '../../common';
import { DASHBOARD_INTERNAL_API_PATH } from '../../common/constants';
import type { DashboardSanitizeResponseBody } from '../../server';
import { coreServices } from '../services/kibana_services';
import type { PanelJsonEntry } from './types';

// The sanitize route validates whole dashboards, which require a title
const SANITIZE_DASHBOARD_TITLE = 'Panels to sanitize';

export interface SanitizedPanels {
  /** Sanitized panels in the order they were passed in; `undefined` for dropped panels. */
  panels: Array<PanelJsonEntry | undefined>;
  warnings: NonNullable<DashboardSanitizeResponseBody['warnings']>;
  relatedItems: NonNullable<DashboardSanitizeResponseBody['related_items']>;
  relatedItemsCount: number;
}

/**
 * Validates panels with the dashboard sanitize route, which removes unsupported properties and
 * drops panels that the Dashboards API doesn't support.
 */
export const sanitizePanels = async (
  panels: PanelJsonEntry[],
  signal?: AbortSignal
): Promise<SanitizedPanels> => {
  const result = await coreServices.http.post<DashboardSanitizeResponseBody>(
    `${DASHBOARD_INTERNAL_API_PATH}/_sanitize`,
    {
      version: '1',
      body: JSON.stringify({
        title: SANITIZE_DASHBOARD_TITLE,
        panels: panels.map((panel, index) => ({ ...panel, id: String(index) })),
      }),
      signal,
    }
  );

  const sanitizedPanels = new Map<string | undefined, PanelJsonEntry>(
    (result.data.panels ?? [])
      .filter(isDashboardPanel)
      .map(({ id, type, grid, config }) => [id, { type, grid, config }])
  );

  return {
    panels: panels.map((_, index) => sanitizedPanels.get(String(index))),
    warnings: result.warnings ?? [],
    relatedItems: result.related_items ?? [],
    relatedItemsCount: result.related_items_count ?? result.related_items?.length ?? 0,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext } from '@kbn/core/server';
import type { Reference } from '@kbn/content-management-utils';
import type { DashboardSavedObjectAttributes } from './dashboard_saved_object';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../common/constants';
import { transformDashboardOut } from './api/transforms';
import type { DashboardState } from './api';

/**
 * The result of scanning dashboards.
 * Contains a paginated list of dashboard summaries.
 */
export interface ScanDashboardsResult {
  /** Array of dashboard summaries with their metadata. */
  dashboards: Array<
    Pick<DashboardState, 'description' | 'panels' | 'tags' | 'title'> & {
      id: string;
      references: Reference[];
    }
  >;
  /** The current page number. */
  page: number;
  /** The total number of dashboards. */
  total: number;
}

export async function scanDashboards(
  ctx: RequestHandlerContext,
  page: number,
  perPage: number
): Promise<ScanDashboardsResult> {
  const { core } = await ctx.resolve(['core']);
  const soResponse = await core.savedObjects.client.find<DashboardSavedObjectAttributes>({
    type: DASHBOARD_SAVED_OBJECT_TYPE,
    fields: ['description', 'title', 'panelsJSON'],
    perPage,
    page,
  });

  return {
    dashboards: soResponse.saved_objects.map((so) => {
      const { description, tags, title, panels } = transformDashboardOut(
        so.attributes,
        so.references
      );

      return {
        id: so.id,
        references: so.references,
        description,
        panels: panels ?? [],
        tags,
        title: title ?? '',
      };
    }),
    page: soResponse.page,
    total: soResponse.total,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tagsToFindOptions } from '@kbn/content-management-utils';
import type { RequestHandlerContext } from '@kbn/core/server';
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { DashboardSearchRequestBody, DashboardSearchResponseBody } from './types';
import { transformDashboardOut } from '../transforms';
import { getDashboardMeta } from '../saved_object_utils';

export async function search(
  requestCtx: RequestHandlerContext,
  searchBody: DashboardSearchRequestBody
): Promise<DashboardSearchResponseBody> {
  const { core } = await requestCtx.resolve(['core']);
  const soResponse = await core.savedObjects.client.find<DashboardSavedObjectAttributes>({
    type: DASHBOARD_SAVED_OBJECT_TYPE,
    searchFields: ['title^3', 'description'],
    fields: [
      'description',
      'title',
      // required fields to load timeRange
      'timeFrom',
      'timeTo',
      'timeRestore',
    ],
    search: searchBody.search,
    perPage: searchBody.per_page,
    page: searchBody.page ? +searchBody.page : undefined,
    defaultSearchOperator: 'AND',
    ...tagsToFindOptions(searchBody.tags),
  });

  return {
    dashboards: soResponse.saved_objects.map((so) => {
      const { description, tags, time_range, title } = transformDashboardOut(
        so.attributes,
        so.references
      );

      return {
        id: so.id,
        data: {
          ...(description && { description }),
          ...(tags && { tags }),
          ...(time_range && { time_range }),
          ...(so?.accessControl && {
            access_control: {
              owner: so.accessControl.owner,
              access_mode: so.accessControl.accessMode,
            },
          }),
          title: title ?? '',
        },
        meta: getDashboardMeta(so, 'search'),
      };
    }),
    page: soResponse.page,
    total: soResponse.total,
  };
}

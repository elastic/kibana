/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_USE_GA_SCHEMAS_FEATURE_FLAG, getMeta } from '@kbn/as-code-shared-schemas';
import { tagsToFindOptions } from '@kbn/content-management-utils';
import type { RequestHandlerContext } from '@kbn/core/server';

import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import { transformDashboardOut } from '../transforms';
import type {
  DashboardSearchRequestParams,
  DashboardSearchResponseBody,
  LegacyDashboardSearchRequestParams,
  LegacyDashboardSearchResponseBody,
} from './types';

export async function search(
  requestCtx: RequestHandlerContext,
  searchParams: DashboardSearchRequestParams | LegacyDashboardSearchRequestParams,
  strictValidationSchema: ReturnType<typeof getDashboardStateSchema>
): Promise<DashboardSearchResponseBody | LegacyDashboardSearchResponseBody> {
  const { core } = await requestCtx.resolve(['core']);
  const useAsCodeSearchSchemas = await core.featureFlags.getBooleanValue(
    AS_CODE_USE_GA_SCHEMAS_FEATURE_FLAG,
    false
  );
  const normalizeToArray = (value?: string | string[]) => {
    if (value === undefined) return undefined;
    return Array.isArray(value) ? value : [value];
  };

  const includedTags = normalizeToArray(searchParams.tags);
  const excludedTags = normalizeToArray(searchParams.excluded_tags);

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
    search: searchParams.query,
    perPage: searchParams.per_page,
    page: searchParams.page,
    defaultSearchOperator: 'AND',
    ...tagsToFindOptions({ included: includedTags, excluded: excludedTags }),
  });

  if (useAsCodeSearchSchemas) {
    return {
      data: soResponse.saved_objects.map((so) => {
        const {
          dashboardState: { description, tags, time_range, title },
        } = transformDashboardOut(so.attributes, so.references);

        return {
          id: so.id,
          data: {
            ...(description && { description }),
            ...(tags && { tags }),
            ...(time_range && { time_range }),
            ...(so?.accessControl && {
              access_control: {
                access_mode: so.accessControl.accessMode,
              },
            }),
            title: title ?? '',
          },
          meta: getMeta(so),
        };
      }),
      meta: { total: soResponse.total, page: soResponse.page, per_page: soResponse.per_page },
    } as DashboardSearchResponseBody;
  }

  return {
    dashboards: soResponse.saved_objects.map((so) => {
      const {
        dashboardState: { description, tags, time_range, title },
      } = transformDashboardOut(so.attributes, so.references, undefined, strictValidationSchema);

      return {
        id: so.id,
        data: {
          ...(description && { description }),
          ...(tags && { tags }),
          ...(time_range && { time_range }),
          ...(so?.accessControl && {
            access_control: {
              access_mode: so.accessControl.accessMode,
            },
          }),
          title: title ?? '',
        },
        meta: getMeta(so),
      };
    }),
    page: soResponse.page,
    total: soResponse.total,
  } as LegacyDashboardSearchResponseBody;
}

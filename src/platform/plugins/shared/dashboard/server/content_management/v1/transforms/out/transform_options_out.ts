/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../../../../common/content_management';
import type { optionsSchema } from '../../cm_services';
import type { DashboardAttributes } from '../../types';

export function transformOptionsOut(
  optionsJSON: string,
  controlGroupShowApplyButtonSetting: boolean | undefined
): DashboardAttributes['options'] {
  const options: TypeOf<typeof optionsSchema> = transformOptionsSetDefaults(
    JSON.parse(optionsJSON)
  );

  return {
    ...options,
    ...{
      autoApplyFilters: !controlGroupShowApplyButtonSetting,
    },
  };
}

// TODO We may want to remove setting defaults in the future
function transformOptionsSetDefaults(options: DashboardAttributes['options']) {
  return {
    ...DEFAULT_DASHBOARD_OPTIONS,
    ...options,
  };
}

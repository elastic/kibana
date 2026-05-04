/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSourceContext } from '../../../profiles';
import type { ContextWithProfileId } from '../../../profile_service';

export const CHANGE_POINT_DATA_SOURCE_PROFILE_ID = 'change-point-data-source-profile';

export interface ChangePointLensDataSourceContext {
  typeColumnId: string;
}

export const isChangePointDataSourceContext = (
  dataSourceContext: ContextWithProfileId<DataSourceContext>
): dataSourceContext is ContextWithProfileId<
  DataSourceContext & ChangePointLensDataSourceContext
> =>
  dataSourceContext.profileId === CHANGE_POINT_DATA_SOURCE_PROFILE_ID &&
  'typeColumnId' in dataSourceContext &&
  typeof (dataSourceContext as ChangePointLensDataSourceContext).typeColumnId === 'string';

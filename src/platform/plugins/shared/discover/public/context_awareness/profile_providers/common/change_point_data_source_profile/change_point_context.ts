/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { DataSourceContext } from '../../../profiles';
import type { ContextWithProfileId } from '../../../profile_service';
import type { ChangePointLensFetchSlice } from './change_point_lens_embeddable';

export const CHANGE_POINT_DATA_SOURCE_PROFILE_ID = 'change-point-data-source-profile';

/**
 * Lens chart data for the change point document tab, keyed by {@link DataTableRecord.id}
 * (ES|QL rows use String(rowIndex)).
 */
export interface ChangePointLensDocContext {
  lensAttributesByRecordId: Record<string, TypedLensByValueInput['attributes']>;
  fetchSlice: ChangePointLensFetchSlice;
}

export interface ChangePointLensDataSourceContext {
  changePointLensContext$: BehaviorSubject<ChangePointLensDocContext | undefined>;
}

export const isChangePointDataSourceContext = (
  dataSourceContext: ContextWithProfileId<DataSourceContext>
): dataSourceContext is ContextWithProfileId<
  DataSourceContext & ChangePointLensDataSourceContext
> =>
  dataSourceContext.profileId === CHANGE_POINT_DATA_SOURCE_PROFILE_ID &&
  'changePointLensContext$' in dataSourceContext &&
  (dataSourceContext as DataSourceContext & ChangePointLensDataSourceContext)
    .changePointLensContext$ instanceof BehaviorSubject;

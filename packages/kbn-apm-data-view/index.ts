/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const APM_STATIC_DATA_VIEW_ID_PREFIX = 'apm_static_data_view_id';

export function getStaticDataViewId(spaceId: string) {
  return `${APM_STATIC_DATA_VIEW_ID_PREFIX}_${spaceId}`;
}

export function isAPMDataView(dataViewId: string) {
  return dataViewId.includes(APM_STATIC_DATA_VIEW_ID_PREFIX);
}

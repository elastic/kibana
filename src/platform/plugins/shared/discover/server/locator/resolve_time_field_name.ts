/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import type { LocatorServicesDeps } from '.';
import type { DiscoverAppLocatorParams } from '../../common';

/**
 * Resolves the time field name from locator params, falling back to loading
 * the data view from saved objects when only a dataViewId is provided.
 *
 * @internal
 */
export const resolveTimeFieldName = async (
  params: DiscoverAppLocatorParams,
  services: LocatorServicesDeps
): Promise<string | undefined> => {
  if (params.dataViewSpec?.timeFieldName) {
    return params.dataViewSpec.timeFieldName;
  }

  if (params.dataViewId) {
    try {
      const dataViewSavedObject = await services.savedObjects.get(
        DATA_VIEW_SAVED_OBJECT_TYPE,
        params.dataViewId
      );
      return (dataViewSavedObject.attributes as Record<string, unknown>).timeFieldName as
        | string
        | undefined;
    } catch {
      return undefined;
    }
  }

  return undefined;
};

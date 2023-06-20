/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LocatorDefinition } from '@kbn/share-plugin/public';
import { SerializableRecord } from '@kbn/utility-types';
import { APP_ID } from '../common/ems_defaults';

export interface EmsLocatorParams extends SerializableRecord {
  basemapId?: string;
  layerId?: string;
}

export const EMS_LOCATOR_ID = 'EMS_LOCATOR_ID';

export class EmsLocatorDefinition implements LocatorDefinition<EmsLocatorParams> {
  public readonly id = EMS_LOCATOR_ID;
  public readonly getLocation = async (params: EmsLocatorParams) => {
    const { basemapId, layerId } = params;
    let path = `/ems`;
    if (basemapId) {
      path = `${path}/basemap/${basemapId}`;
    }
    if (layerId) {
      path = `${path}/layer/${layerId}`;
    }

    return {
      app: APP_ID,
      path,
      state: {},
    };
  };
}

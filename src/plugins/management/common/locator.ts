/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import { MANAGEMENT_APP_ID } from './contants';

export const MANAGEMENT_APP_LOCATOR = 'MANAGEMENT_APP_LOCATOR';

export interface ManagementAppLocatorParams extends SerializableRecord {
  sectionId: string;
  appId?: string;
}

export type ManagementAppLocator = LocatorPublic<ManagementAppLocatorParams>;

export class ManagementAppLocatorDefinition
  implements LocatorDefinition<ManagementAppLocatorParams>
{
  public readonly id = MANAGEMENT_APP_LOCATOR;

  public readonly getLocation = async (params: ManagementAppLocatorParams) => {
    const path = `/${params.sectionId}${params.appId ? '/' + params.appId : ''}`;

    return {
      app: MANAGEMENT_APP_ID,
      path,
      state: {},
    };
  };
}

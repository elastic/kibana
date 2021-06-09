/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableState } from 'src/plugins/kibana_utils/common';
import { LocatorDefinition } from 'src/plugins/share/common';
import { MANAGEMENT_APP_ID } from './contants';

export const MANAGEMENT_APP_LOCATOR = 'MANAGEMENT_APP_LOCATOR';

export interface ManagementAppLocatorParams extends SerializableState {
  sectionId?: string;
  appId?: string;
}

export interface ManagementAppDependencies {
  getAppBasePath?: (appId: string) => Promise<string>;
}

export class ManagementAppLocator implements LocatorDefinition<ManagementAppLocatorParams> {
  constructor(protected readonly deps: ManagementAppDependencies) {}

  public readonly id = MANAGEMENT_APP_LOCATOR;

  public readonly getLocation = async (params: ManagementAppLocatorParams) => {
    let route = '';

    if (params.sectionId) {
      route = `/${params.sectionId}${params.appId ? '/' + params.appId : ''}`;
    } else if (params.appId && this.deps.getAppBasePath) {
      route = await this.deps.getAppBasePath(params.appId);
    }

    return {
      app: MANAGEMENT_APP_ID,
      route,
      state: {},
    };
  };
}

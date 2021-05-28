/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableState } from 'src/plugins/kibana_utils/common';
import type { KibanaLocation, LocatorDefinition } from '../../../common/url_service';
import { AbstractLocator } from '../../../common/url_service';

export interface BrowserLocatorDependencies {
  navigate: (location: KibanaLocation, params?: NavigationParams) => Promise<void>;
}

export interface NavigationParams {
  replace?: boolean;
}

export class BrowserLocator<P extends SerializableState> extends AbstractLocator<P> {
  constructor(
    definition: LocatorDefinition<P>,
    protected readonly deps: BrowserLocatorDependencies
  ) {
    super(definition);
  }

  public async navigate(params: P, navigationParams?: NavigationParams): Promise<void> {
    const location = this.getLocation(params);
    await this.deps.navigate(location, navigationParams);
  }
}

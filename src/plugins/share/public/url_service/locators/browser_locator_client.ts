/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableState } from 'src/plugins/kibana_utils/common';
import type { BrowserLocatorDependencies } from './browser_locator';
import type { LocatorDefinition } from '../../../common/url_service';
import { AbstractLocatorClient } from '../../../common/url_service';
import { BrowserLocator } from './browser_locator';

export type BrowserLocatorClientDependencies = BrowserLocatorDependencies;

export class BrowserLocatorsClient extends AbstractLocatorClient {
  constructor(protected readonly deps: BrowserLocatorClientDependencies) {
    super();
  }

  protected createLocator<P extends SerializableState>(definition: LocatorDefinition<P>) {
    return new BrowserLocator(definition, this.deps);
  }
}

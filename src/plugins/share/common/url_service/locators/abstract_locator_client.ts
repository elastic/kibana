/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableState } from 'src/plugins/kibana_utils/common';
import { AbstractLocator } from './abstract_locator';
import { LocatorClient, LocatorDefinition, LocatorPublic } from './types';

export abstract class AbstractLocatorClient implements Pick<LocatorClient, 'create' | 'get'> {
  protected abstract readonly Locator: new <P extends SerializableState>(
    definition: LocatorDefinition<P>
  ) => AbstractLocator<P>;

  protected locators: Map<string, AbstractLocator<any>> = new Map();

  public create<P extends SerializableState>(definition: LocatorDefinition<P>): LocatorPublic<P> {
    const locator = new this.Locator<P>(definition);

    this.locators.set(definition.id, locator);

    return locator;
  }

  public get<P>(id: string): LocatorPublic<P> {
    throw new Error('not implemented');
  }
}

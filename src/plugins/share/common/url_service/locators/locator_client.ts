/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableState } from 'src/plugins/kibana_utils/common';
import type { LocatorDependencies } from './locator';
import type { LocatorDefinition, LocatorPublic, ILocatorClient } from './types';
import { Locator } from './locator';

export type LocatorClientDependencies = LocatorDependencies;

export class LocatorClient implements ILocatorClient {
  /**
   * Collection of registered locators.
   */
  protected locators: Map<string, Locator<any>> = new Map();

  constructor(protected readonly deps: LocatorClientDependencies) {}

  /**
   * Creates and register a URL locator.
   *
   * @param definition A definition of URL locator.
   * @returns A public interface of URL locator.
   */
  public create<P extends SerializableState>(definition: LocatorDefinition<P>): LocatorPublic<P> {
    const locator = new Locator<P>(definition, this.deps);

    this.locators.set(definition.id, locator);

    return locator;
  }

  /**
   * Returns a previously registered URL locator.
   *
   * @param id ID of a URL locator.
   * @returns A public interface of a registered URL locator.
   */
  public get<P>(id: string): undefined | LocatorPublic<P> {
    return this.locators.get(id);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutPage } from '../../fixtures';

/**
 * Creates a lazily instantiated proxy for a Page Object class, deferring the creation of the instance until
 * a property or method is accessed. It helps avoiding instantiation of page objects that may not be used
 * in certain test scenarios.
 *
 * @param PageObjectClass - The page object class to be instantiated lazily.
 * @param scoutPage - ScoutPage instance, that extends the Playwright `page` fixture and passed to the page object class constructor.
 * @param constructorArgs - Additional arguments to be passed to the page object class constructor.
 * @returns A proxy object that behaves like an instance of the page object class, instantiating it on demand.
 */
export function createLazyPageObject<T extends object, Args extends any[]>(
  PageObjectClass: new (page: ScoutPage, ...args: Args) => T,
  scoutPage: ScoutPage,
  ...constructorArgs: Args
): T {
  let instance: T | null = null;
  return new Proxy({} as T, {
    get(_, prop: string | symbol) {
      if (!instance) {
        instance = new PageObjectClass(scoutPage, ...constructorArgs);
      }
      if (typeof prop === 'symbol' || !(prop in instance)) {
        return undefined;
      }
      return instance[prop as keyof T];
    },
  });
}

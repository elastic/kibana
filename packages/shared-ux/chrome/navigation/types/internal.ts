/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';

/**
 * @internal
 */
export interface ILocatorPublic {
  navigateSync: <P extends SerializableRecord>(params: P) => void;
}

/**
 * @internal
 */
export type GetLocatorFn = (locatorId: string) => ILocatorPublic | undefined;

/**
 * @internal
 */
export type SetActiveNavItemIdFn = (activeNavItemId: string) => void;

/**
 * @internal
 */
export interface RecentItem {
  link: string;
  label: string;
  id: string;
}

/**
 * Locator info used for navigating around Kibana
 * @internal
 */
export interface ILocatorDefinition<P = SerializableRecord> {
  /**
   * ID of a registered LocatorDefinition
   */
  id: string;
  /**
   * Navigational params in the form understood by the locator's plugin.
   */
  params?: P;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';

/**
 * Allows the Presentation Container to provide generic untyped context to its children.
 *
 * For example, alerting page links to dashboards.
 * Linked dashboard panels should show the alert from alerting page.
 * The alerting page can use passThroughContext to pass '{ alert }' state to embeddables.
 * Embeddables can access passThroughContext from 'parentApi.getPassThroughContext()'
 * and use the state to show the alert from the alerting page.
 */
export interface PassThroughContext {
  getPassThroughContext: () => SerializableRecord | undefined;
}

/**
 * A type guard which can be used to determine if a given API supports PassThroughContext
 */
export const apiSupportsPassThroughContext = (api: unknown): api is PassThroughContext => {
  return typeof (api as PassThroughContext)?.getPassThroughContext === 'function';
};

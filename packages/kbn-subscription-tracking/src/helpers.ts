/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SubscriptionContextData } from '../types';

const sourceStringRegEx = /^(\w[\w\-_]*)__(\w[\w\-_]*)$/;
export function isValidContext(context: SubscriptionContextData): boolean {
  return context.feature.length > 0 && sourceStringRegEx.test(context.source);
}

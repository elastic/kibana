/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Returns true if the given array contains at least 1 object
 */
export function arrayContainsObjects(value: unknown[]): boolean {
  return Array.isArray(value) && value.some((v) => typeof v === 'object' && v !== null);
}

/**
 * Removes markup added by kibana fields html formatter
 */
export function trimAngularSpan(text: string): string {
  return text.replace(/^<span ng-non-bindable>/, '').replace(/<\/span>$/, '');
}

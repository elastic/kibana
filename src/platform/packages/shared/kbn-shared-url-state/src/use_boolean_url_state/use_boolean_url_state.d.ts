/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type UseBooleanUrlStateResult = [boolean, (next: boolean) => void];
/**
 * Binds a boolean value to a URL query parameter via the app's scoped history so
 * browser Back/Forward navigation restores the value. Must be called inside a `<Router>`.
 *
 * Opening (true) pushes a history entry so Back closes; closing (false) replaces the
 * entry and removes the param from the URL.
 */
export declare const useBooleanUrlState: (paramName: string) => UseBooleanUrlStateResult;

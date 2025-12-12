/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, type Context } from 'react';

const globalContextRegistry: Record<string, Context<any>> = {};

export function getOrCreateContext<T>(ctxName: string, defaultValue?: T): Context<T> {
  return (globalContextRegistry[ctxName] ??= createContext<T>(defaultValue as T));
}

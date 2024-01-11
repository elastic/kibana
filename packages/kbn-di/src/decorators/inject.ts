/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'reflect-metadata';

export interface InjectOptions<T> {

}

export function Inject<T = unknown>(options: InjectOptions<T> = {}): Function {
  return function (target: Object, propertyName: string | symbol, index?: number): void {
    console.log('*** Inject', arguments)
  }
}

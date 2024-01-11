/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'reflect-metadata';

export type ServiceScope = 'global' | 'user' | 'request';

export interface ServiceOptions<T> {

}

Reflect.metadata()

export function Service<T = unknown>(options: ServiceOptions<T> = {}): ClassDecorator {
  return (targetConstructor, options) => {
    console.log('*** Service', options)
    Reflect.defineMetadata('someKey', { hello: "dolly"}, targetConstructor);
  }
}

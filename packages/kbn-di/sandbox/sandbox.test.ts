/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Service, ServiceOptions, Inject, InjectOptions } from '../src/decorators';

@Service()
class A {
  @Inject()
  doFoo(first: string, second: number) {}
}


function foo() {}

Reflect.defineMetadata('anotherKey', 'someValue', foo);

describe('some tests', () => {
  it('foo', () => {
    const a = new A();
    new A();

    const metadata = Reflect.getMetadata('someKey', A);
    console.log('metadata = ', metadata);

    console.log('foo metadata = ', Reflect.getMetadata('anotherKey', foo));
  });
});

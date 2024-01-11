/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { InjectionContainerImpl } from '../src/container';
import { serviceId } from '../src/service';

interface TestInterfaceA {
  foo: string;
}

interface TestInterfaceB {
  bar: string;
}

describe('InjectionContainerImpl', () => {
  describe('registration', () => {
    // TODO
  });

  describe('single container', () => {
    it('injects one factory into another one', () => {
      const container = new InjectionContainerImpl({ containerId: 'root' });

      container.register<TestInterfaceA>({
        id: 'TestA',
        scope: 'global',
        factory: () => {
          return {
            foo: 'it works',
          };
        },
        parameters: [],
      });

      container.register<TestInterfaceB>({
        id: 'TestB',
        scope: 'global',
        factory: (testA: TestInterfaceA) => {
          return {
            bar: `value from A: ${testA.foo}`,
          };
        },
        parameters: [serviceId('TestA')],
      });

      const testB = container.get<TestInterfaceB>('TestB');

      expect(testB.bar).toEqual(`value from A: it works`);
    });
  });
});

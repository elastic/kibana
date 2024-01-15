/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import { InjectionContainerImpl, CONTEXT_SERVICE_KEY } from '../src/container';
import { serviceId, serviceLabel } from '../src/service';

interface TestInterfaceA {
  foo: string;
}

interface TestInterfaceB {
  bar: string;
}

describe('InjectionContainerImpl', () => {
  describe('single container', () => {
    it('injects one factory into another one', () => {
      const container = new InjectionContainerImpl({
        containerId: 'root',
        context: {},
      });

      container.register<TestInterfaceA>({
        id: 'TestA',
        scope: 'global',
        factory: {
          fn: () => {
            return {
              foo: 'it works',
            };
          },
          params: [],
        },
      });

      container.register<TestInterfaceB>({
        id: 'TestB',
        scope: 'global',
        factory: {
          fn: (testA: TestInterfaceA) => {
            return {
              bar: `value from A: ${testA.foo}`,
            };
          },
          params: [serviceId('TestA')],
        },
      });

      const testB = container.get<TestInterfaceB>('TestB');

      expect(testB.bar).toEqual(`value from A: it works`);
    });

    it('injects one constructor service into another one', () => {
      const container = new InjectionContainerImpl({
        containerId: 'root',
        context: {},
      });

      class ClassA {
        getA() {
          return 'A';
        }
      }

      class ClassB {
        constructor(private classA: ClassA) {}

        getB() {
          return `value from B: ${this.classA.getA()}`;
        }
      }

      container.register<ClassA>({
        id: 'ClassA',
        scope: 'global',
        service: {
          type: ClassA,
          params: [],
        },
      });

      container.register<ClassB>({
        id: 'ClassB',
        scope: 'global',
        service: {
          type: ClassB,
          params: [serviceId('ClassA')],
        },
      });

      const instanceB = container.get<ClassB>('ClassB');

      expect(instanceB.getB()).toEqual(`value from B: A`);
    });

    it('retrieves or injects instances', () => {
      const container = new InjectionContainerImpl({
        containerId: 'root',
        context: {},
      });

      container.register<number>({
        id: 'someNumber',
        scope: 'global',
        instance: 42,
      });

      container.register<{ getNumber: () => number }>({
        id: 'service',
        scope: 'global',
        factory: {
          fn: (someNumber: number) => {
            return {
              getNumber: () => someNumber,
            };
          },
          params: [serviceId('someNumber')],
        },
      });

      const someNumber = container.get('someNumber');
      expect(someNumber).toBe(42);

      const service = container.get<{ getNumber: () => number }>('service');
      expect(service.getNumber()).toEqual(42);
    });

    it('injects by labels', () => {
      const container = new InjectionContainerImpl({
        containerId: 'root',
        context: {},
      });

      container.register<string>({
        id: 'strA',
        scope: 'global',
        factory: {
          fn: () => 'strA',
          params: [],
        },
        labels: ['strService'],
      });

      container.register<string>({
        id: 'strB',
        scope: 'global',
        factory: {
          fn: () => 'strB',
          params: [],
        },
        labels: ['strService'],
      });

      container.register<string>({
        id: 'badLabel',
        scope: 'global',
        factory: {
          fn: () => 'badLabel',
          params: [],
        },
        labels: ['anotherLabel'],
      });

      container.register<{ getAll: () => string[] }>({
        id: 'service',
        scope: 'global',
        factory: {
          fn: (strServices: string[]) => {
            return {
              getAll: () => strServices,
            };
          },
          params: [serviceLabel<string>('strService')],
        },
      });

      const service = container.get<{ getAll: () => string[] }>('service');
      const strings = service.getAll();
      expect(strings).toHaveLength(2);
      expect(strings).toContain('strA');
      expect(strings).toContain('strB');
    });

    it('only calls a factory once for a given container', () => {
      const container = new InjectionContainerImpl({
        containerId: 'root',
        context: {},
      });

      container.register<TestInterfaceA>({
        id: 'TestA',
        scope: 'global',
        factory: {
          fn: jest.fn(() => {
            return {
              foo: 'it works',
            };
          }),
          params: [],
        },
      });

      const resultA = container.get<TestInterfaceA>('TestA');
      const resultB = container.get<TestInterfaceA>('TestA');

      expect(resultA).toBe(resultB);
    });
  });

  describe('parent and single child containers', () => {
    it('retrieves global service registered to parent from child', () => {
      const root = new InjectionContainerImpl({
        containerId: 'root',
        context: {},
      });

      const child = root.createChild({
        id: 'child',
        context: {},
      });

      root.register<string>({
        id: 'someString',
        scope: 'global',
        factory: {
          fn: () => {
            return 'some string';
          },
          params: [],
        },
      });

      const someString = child.get<string>('someString');

      expect(someString).toEqual('some string');
    });

    it('retrieves global service registered to child from parent', () => {
      const root = new InjectionContainerImpl({
        containerId: 'root',
        context: {},
      });

      const child = root.createChild({
        id: 'child',
        context: {},
      });

      child.register<string>({
        id: 'someString',
        scope: 'global',
        factory: {
          fn: () => {
            return 'some string';
          },
          params: [],
        },
      });

      const someString = root.get<string>('someString');

      expect(someString).toEqual('some string');
    });

    it('shares the global instance between parent and child', () => {
      const root = new InjectionContainerImpl({
        containerId: 'root',
        context: {},
      });

      const child = root.createChild({
        id: 'child',
        context: {},
      });

      const factory = jest.fn(() => {
        return { someObject: true };
      });
      child.register<Record<string, unknown>>({
        id: 'someService',
        scope: 'global',
        factory: {
          fn: factory,
          params: [],
        },
      });

      const serviceFromRoot = root.get<string>('someService');
      const serviceFromChild = child.get<string>('someService');

      expect(factory).toHaveBeenCalledTimes(1);
      expect(serviceFromRoot).toBe(serviceFromChild);
    });
  });

  describe('parent and two children', () => {
    it('instantiate container-scoped services once per child', () => {
      const root = new InjectionContainerImpl({
        containerId: 'root',
        context: {},
      });

      const child1 = root.createChild({
        id: 'child1',
        context: {
          someMeta: 'foo',
        },
      });

      const child2 = root.createChild({
        id: 'child2',
        context: {
          someMeta: 'bar',
        },
      });

      const factory = jest.fn().mockImplementation((context: { someMeta: string }) => {
        return `created with meta ${context.someMeta}`;
      });

      root.register<string>({
        id: 'containerService',
        scope: 'container',
        factory: {
          fn: factory,
          params: [serviceId(CONTEXT_SERVICE_KEY)],
        },
      });

      const child1Service = child1.get<string>('containerService');
      expect(child1Service).toEqual('created with meta foo');

      const child2Service = child2.get<string>('containerService');
      expect(child2Service).toEqual('created with meta bar');

      expect(factory).toHaveBeenCalledTimes(2);

      child1.get<string>('containerService');
      child2.get<string>('containerService');

      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe('Optional injection', () => {
    it('does not throw when resolving an optional parameter is not present', () => {
      const container = new InjectionContainerImpl({
        containerId: 'root',
        context: {},
      });

      container.register<number>({
        id: 'someNumber',
        scope: 'global',
        instance: 42,
      });

      const serviceFactory = jest.fn();
      container.register<{ getNumber: () => number }>({
        id: 'service',
        scope: 'global',
        factory: {
          fn: serviceFactory,
          params: [serviceId('notPresent', { optional: true }), serviceId('someNumber')],
        },
      });

      expect(() => container.get<unknown>('service')).not.toThrow();

      expect(serviceFactory).toHaveBeenCalledTimes(1);
      expect(serviceFactory).toHaveBeenCalledWith(undefined, 42);
    });

    it('throws when an optional dependency is present but has an unresolved required dependency', () => {
      const container = new InjectionContainerImpl({
        containerId: 'root',
        context: {},
      });

      container.register<unknown>({
        id: 'serviceA',
        scope: 'global',
        factory: {
          fn: jest.fn(),
          params: [serviceId('notPresent', { optional: false })],
        },
      });

      container.register<unknown>({
        id: 'serviceB',
        scope: 'global',
        factory: {
          fn: jest.fn(),
          params: [serviceId('serviceA', { optional: true })],
        },
      });

      expect(() => container.get<unknown>('serviceB')).toThrowErrorMatchingInlineSnapshot(
        `"Service 'notPresent' not found in container chain starting at id 'root'"`
      );
    });
  });

  describe('Cyclic dependencies', () => {
    it('detects direct graphs', () => {
      const root = new InjectionContainerImpl({
        containerId: 'root',
        context: {},
      });

      root.register<string>({
        id: 'stringA',
        scope: 'container',
        factory: {
          fn: (stringB: string) => {
            return `from stringA: ${stringB}`;
          },
          params: [serviceId('stringB')],
        },
      });

      root.register<string>({
        id: 'stringB',
        scope: 'container',
        factory: {
          fn: (stringA: string) => {
            return `from stringB: ${stringA}`;
          },
          params: [serviceId('stringA')],
        },
      });

      expect(() => root.get('stringA')).toThrowErrorMatchingInlineSnapshot(
        `"Cyclic dependency detected: stringA->stringB->stringA"`
      );
    });

    it('detects indirect graphs', () => {
      const root = new InjectionContainerImpl({
        containerId: 'root',
        context: {},
      });

      root.register<string>({
        id: 'stringA',
        scope: 'container',
        factory: {
          fn: (stringB: string) => {
            return `from stringA: ${stringB}`;
          },
          params: [serviceId('stringB')],
        },
      });

      root.register<string>({
        id: 'stringB',
        scope: 'container',
        factory: {
          fn: (stringC: string) => {
            return `from stringB: ${stringC}`;
          },
          params: [serviceId('stringC')],
        },
      });

      root.register<string>({
        id: 'stringC',
        scope: 'container',
        factory: {
          fn: (stringD: string) => {
            return `from stringC: ${stringD}`;
          },
          params: [serviceId('stringD')],
        },
      });

      root.register<string>({
        id: 'stringD',
        scope: 'container',
        factory: {
          fn: (stringB: string) => {
            return `from stringD: ${stringB}`;
          },
          params: [serviceId('stringB')],
        },
      });

      expect(() => root.get('stringA')).toThrowErrorMatchingInlineSnapshot(
        `"Cyclic dependency detected: stringB->stringC->stringD->stringB"`
      );
    });
  });
});

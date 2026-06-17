/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getExtensions, getService, Start } from '@kbn/core-di';
import { Container } from 'inversify';
import { createTokenFactory } from './create_token_factory';
import { declare, fromToken, implementedBy, using, withValue } from './declare_services';

describe('createTokenFactory', () => {
  it('creates fully-qualified service and extension point tokens', () => {
    const myPlugin = createTokenFactory('myPlugin');

    expect(myPlugin.service('MyService')).toBe(Symbol.for('myPlugin.MyService'));
    expect(myPlugin.extensionPoint('MyExtensionPoint')).toBe(
      Symbol.for('myPlugin.MyExtensionPoint')
    );
  });

  it('rejects invalid plugin ids and local token names', () => {
    expect(() => createTokenFactory('BadPlugin')).toThrow(
      'createTokenFactory("BadPlugin") must use a camelCase plugin id'
    );

    const myPlugin = createTokenFactory('validPlugin');

    expect(() => myPlugin.service('notPascalCase')).toThrow(
      'createTokenFactory name "notPascalCase" must use PascalCase'
    );
    expect(() => myPlugin.service('Bad.Name')).toThrow(
      'createTokenFactory name "Bad.Name" must be a local PascalCase name without dots'
    );
  });

  it('throws when the same fully-qualified token is defined twice', () => {
    const first = createTokenFactory('duplicatePlugin');
    const second = createTokenFactory('duplicatePlugin');

    first.service('DuplicateToken');

    expect(() => second.service('DuplicateToken')).toThrow(
      'Cross-plugin token "duplicatePlugin.DuplicateToken" is defined more than once'
    );
  });
});

class TestService {
  greet() {
    return 'hi';
  }
}

describe('declare', () => {
  it('binds services and extension points', () => {
    const myPlugin = createTokenFactory('containerPlugin');
    const MyService = myPlugin.service<string>('MyService');
    const MyExtensionPoint = myPlugin.extensionPoint<string>('MyExtensionPoint');

    const container = new Container();
    container.loadSync(
      declare(({ contribute, host, provide }) => {
        provide(MyService, withValue('hello'));
        host(MyExtensionPoint);
        contribute(MyExtensionPoint, 'world');
      })
    );

    expect(getService(container, MyService)).toBe('hello');
    expect(getExtensions(container, MyExtensionPoint)).toEqual(['world']);
  });

  it('provides a service from a start selector', () => {
    const myPlugin = createTokenFactory('startPlugin');
    const StartedService = myPlugin.service<string>('StartedService');

    const container = new Container();
    container.bind(Start).toConstantValue('started');
    container.loadSync(
      declare<string>(({ provide }) => {
        provide(StartedService, (start) => `${start}!`);
      })
    );

    expect(getService(container, StartedService)).toBe('started!');
  });

  it('provides a class-backed service with implementedBy', () => {
    const myPlugin = createTokenFactory('implPlugin');
    const GreeterToken = myPlugin.service<TestService>('Greeter');

    const container = new Container();
    container.loadSync(
      declare(({ provide }) => {
        provide(GreeterToken, implementedBy(TestService));
      })
    );

    expect(getService(container, GreeterToken).greet()).toBe('hi');
  });

  it('derives a service from another token with fromToken', () => {
    const myPlugin = createTokenFactory('derivePlugin');
    const SourceToken = myPlugin.service<{ value: number }>('Source');
    const DerivedToken = myPlugin.service<number>('Derived');

    const container = new Container();
    container.loadSync(
      declare(({ provide }) => {
        provide(SourceToken, withValue({ value: 21 }));
        provide(
          DerivedToken,
          fromToken(SourceToken, (source) => source.value * 2)
        );
      })
    );

    expect(getService(container, DerivedToken)).toBe(42);
  });

  it('supports the using() escape hatch', () => {
    const myPlugin = createTokenFactory('usingPlugin');
    const Token = myPlugin.service<string>('Custom');

    const container = new Container();
    container.loadSync(
      declare(({ provide }) => {
        provide(
          Token,
          using<string>((bindTo) => bindTo.toConstantValue('custom'))
        );
      })
    );

    expect(getService(container, Token)).toBe('custom');
  });

  describe('fulfillment branding', () => {
    const hasBrand = (value: object) =>
      Object.getOwnPropertySymbols(value).some(
        (symbol) => (value as Record<symbol, unknown>)[symbol] === true
      ) && typeof (value as { configure?: unknown }).configure === 'function';

    it('marks every helper result with the brand own-property', () => {
      expect(hasBrand(implementedBy(TestService))).toBe(true);
      expect(hasBrand(withValue('value'))).toBe(true);
      expect(hasBrand(fromToken(Symbol.for('dep'), (dep) => dep))).toBe(true);
      expect(hasBrand(using<string>((bindTo) => bindTo.toConstantValue('value')))).toBe(true);
    });

    it('does not treat a bare selector or value as a fulfillment', () => {
      expect(hasBrand(() => 'value')).toBe(false);
      expect(hasBrand({ id: 'value' })).toBe(false);
    });
  });

  describe('explicit singleton scope under a plain container', () => {
    it('resolves an implementedBy service as a singleton', () => {
      const myPlugin = createTokenFactory('singletonImplPlugin');
      const CounterToken = myPlugin.service<TestService>('Counter');

      const container = new Container();
      container.loadSync(
        declare(({ provide }) => {
          provide(CounterToken, implementedBy(TestService));
        })
      );

      expect(getService(container, CounterToken)).toBe(getService(container, CounterToken));
    });

    it('resolves a start selector as a singleton', () => {
      const myPlugin = createTokenFactory('singletonStartPlugin');
      const Token = myPlugin.service<{ id: number }>('StartSingleton');

      const container = new Container();
      container.bind(Start).toConstantValue({});
      container.loadSync(
        declare(({ provide }) => {
          provide(Token, () => ({ id: Math.random() }));
        })
      );

      expect(getService(container, Token)).toBe(getService(container, Token));
    });

    it('resolves a fromToken service as a singleton', () => {
      const myPlugin = createTokenFactory('singletonDerivePlugin');
      const SourceToken = myPlugin.service<{ value: number }>('DeriveSource');
      const DerivedToken = myPlugin.service<{ id: number }>('DeriveSingleton');

      const container = new Container();
      container.loadSync(
        declare(({ provide }) => {
          provide(SourceToken, withValue({ value: 1 }));
          provide(
            DerivedToken,
            fromToken(SourceToken, () => ({ id: Math.random() }))
          );
        })
      );

      expect(getService(container, DerivedToken)).toBe(getService(container, DerivedToken));
    });
  });

  it('requires declare<TStart> before reading from start (type-level)', () => {
    const myPlugin = createTokenFactory('typeTestPlugin');
    const Token = myPlugin.service<string>('TypeTest');

    // The callback is deferred until the module loads, so this never runs here;
    // the assertion is the @ts-expect-error below, validated at type-check time.
    declare(({ provide }) => {
      // @ts-expect-error - start is RequiresPluginStart until a start contract is passed to declare<...>
      provide(Token, (start) => start.anything);
    });
  });
});

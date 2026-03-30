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
import { declare } from './declare_services';

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

  it('binds services and extension points through declare()', () => {
    const myPlugin = createTokenFactory('containerPlugin');
    const MyService = myPlugin.service<string>('MyService');
    const MyExtensionPoint = myPlugin.extensionPoint<string>('MyExtensionPoint');

    const container = new Container();
    container.loadSync(
      declare(({ contribute, host, provide }) => {
        provide(MyService).toConstantValue('hello');
        host(MyExtensionPoint);
        contribute(MyExtensionPoint).toConstantValue('world');
      })
    );

    expect(getService(container, MyService)).toBe('hello');
    expect(getExtensions(container, MyExtensionPoint)).toEqual(['world']);
  });

  it('supports fromStart() sugar', () => {
    const myPlugin = createTokenFactory('startPlugin');
    const StartedService = myPlugin.service<string>('StartedService');

    const container = new Container();
    container.bind(Start).toConstantValue('started');
    container.loadSync(
      declare(({ provide }) => {
        provide(StartedService).fromStart<string>((start) => `${start}!`);
      })
    );

    expect(getService(container, StartedService)).toBe('started!');
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: will need to move somewhere more global - must be imported exactly once
import 'reflect-metadata';
import { Container, ContainerModule, inject, injectable, interfaces } from 'inversify';

type foo = interfaces.Context;

const containerModule = new ContainerModule((bind) => {});

describe('inversify', () => {
  const someFactoryToken: interfaces.ServiceIdentifier<{ foo: string }> = Symbol.for('someFactory');
  /*
  it('test', () => {
    const container = new Container({ skipBaseClassChecks: true, defaultScope: 'Singleton' });

    const observer = jest.fn();

    container
      .bind(someFactoryToken)
      .toDynamicValue(({ container }) => {
        observer();
        return { foo: container.id };
      })
      .inSingletonScope();

    container.get(someFactoryToken);
    container.get(someFactoryToken);

    expect(observer).toHaveBeenCalledTimes(1);
  });

  it('test2', () => {
    const container = new Container({ skipBaseClassChecks: true, defaultScope: 'Singleton' });

    const observer = jest.fn();

    container
      .bind(someFactoryToken)
      .toDynamicValue(({ container }) => {
        observer();
        return { foo: container.id };
      })
      .inSingletonScope();

    const child1 = container.createChild({});
    const child2 = container.createChild({});

    child1.get(someFactoryToken);
    child2.get(someFactoryToken);

    expect(observer).toHaveBeenCalledTimes(1);
  });

  it('test5', () => {
    // is included in MyPluginModule
    @injectable()
    class PluginAService {
      constructor(@inject('pluginConfig') private readonly config: PluginConfig) {}
    }

    class Plugin {
      setup(core) {
        core.di.registerModule((childContainer) => {
          childContainer.load(MyPluginModule());

          return new ContainerModule((bind) => {
            bind(PluginAService)
              .toDynamicValue(() => {
                return childContainer.get(PluginAService);
              })
              .inSingletonScope();
          });
        });
      }
    }
  });
   */

  /*
  it('test3', () => {
    type PluginConfig = unknown; // marker interface for plugin config for example
    const pluginConfigToken: interfaces.ServiceIdentifier<PluginConfig> =
      Symbol.for('pluginConfig');

    const rootContainer = new Container({ skipBaseClassChecks: true, defaultScope: 'Singleton' });

    const pluginAContainer = rootContainer.createChild();
    pluginAContainer.bind(pluginConfigToken, pluginAConfig);

    const pluginBContainer = rootContainer.createChild();
    pluginBContainer.bind(pluginConfigToken, pluginBConfig);

    @injectable()
    class PluginAService {
      constructor(@inject('pluginConfigToken') private readonly config: PluginConfig) {}
    }

    // won't be able to resolve given the root container don't know about pluginConfigToken
    rootContainer.bind(PluginAService).toSelf();

  });


  it('test4', () => {
    type PluginConfig = unknown; // marker interface for plugin config for example
    const pluginConfigToken: interfaces.ServiceIdentifier<PluginConfig> =
      Symbol.for('pluginConfig');

    const rootContainer = new Container({ skipBaseClassChecks: true, defaultScope: 'Singleton' });
    rootContainer.bind(pluginConfigToken).to(pluginAConfig).whenTargetNamed('pluginA');
    rootContainer.bind(pluginConfigToken).to(pluginBConfig).whenTargetNamed('pluginB');


    @injectable()
    class PluginAService {
      constructor(@inject('pluginConfigToken') @named('pluginA') private readonly config: PluginConfig) {}
    }

    const pluginAContainer = rootContainer.createChild();
    pluginAContainer.bind(pluginConfigToken, pluginAConfig);

    const pluginBContainer = rootContainer.createChild();
    pluginBContainer.bind(pluginConfigToken, pluginBConfig);

    @injectable()
    class PluginAService {
      constructor(@inject('pluginConfigToken') private readonly config: PluginConfig) {}
    }

    // won't be able to resolve given the root container don't know about pluginConfigToken
    rootContainer.bind(PluginAService).toSelf();

  });
   */
});

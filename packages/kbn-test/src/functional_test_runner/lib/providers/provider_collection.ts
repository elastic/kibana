/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';

import { loadTracer } from '../load_tracer';
import { createAsyncInstance, isAsyncInstance } from './async_instance';
import { Providers } from './read_provider_spec';
import { createVerboseInstance } from './verbose_instance';
import { GenericFtrService } from '../../public_types';

export class ProviderCollection {
  static callProviderFn(providerFn: any, ctx: any) {
    if (providerFn.prototype instanceof GenericFtrService) {
      const Constructor = providerFn as any as new (ctx: any) => any;
      return new Constructor(ctx);
    }

    return providerFn(ctx);
  }

  private readonly instances = new Map();

  constructor(private readonly log: ToolingLog, private readonly providers: Providers) {}

  public getService = (name: string) => this.getInstance('Service', name);

  public hasService = (name: string) => Boolean(this.findProvider('Service', name));

  public getPageObject = (name: string) => this.getInstance('PageObject', name);

  public getPageObjects = (names: string[]) => {
    const pageObjects: Record<string, any> = {};
    names.forEach((name) => (pageObjects[name] = this.getPageObject(name)));
    return pageObjects;
  };

  public loadExternalService(name: string, provider: (...args: any) => any) {
    return this.getInstance('Service', name, provider);
  }

  public async loadAll() {
    const asyncInitFailures = [];

    await Promise.all(
      this.providers.map(async ({ type, name }) => {
        try {
          const instance = this.getInstance(type, name);
          if (isAsyncInstance(instance)) {
            await instance.init();
          }
        } catch (err) {
          this.log.warning('Failure loading service %j', name);
          this.log.error(err);
          asyncInitFailures.push(name);
        }
      })
    );

    if (asyncInitFailures.length) {
      throw new Error(`Failure initializing ${asyncInitFailures.length} service(s)`);
    }
  }

  public invokeProviderFn(provider: (args: any) => any) {
    return ProviderCollection.callProviderFn(provider, {
      getService: this.getService,
      hasService: this.hasService,
      getPageObject: this.getPageObject,
      getPageObjects: this.getPageObjects,
    });
  }

  private findProvider(type: string, name: string) {
    return this.providers.find((p) => p.type === type && p.name === name);
  }

  private getProvider(type: string, name: string) {
    const providerDef = this.findProvider(type, name);
    if (!providerDef) {
      throw new Error(`Unknown ${type} "${name}"`);
    }
    return providerDef.fn;
  }

  private getInstance(type: string, name: string, provider = this.getProvider(type, name)) {
    const instances = this.instances;

    return loadTracer(provider, `${type}(${name})`, () => {
      if (!provider) {
        throw new Error(`Unknown ${type} "${name}"`);
      }

      if (!instances.has(provider)) {
        let instance = this.invokeProviderFn(provider);

        if (instance && typeof instance.then === 'function') {
          instance = createAsyncInstance(type, name, instance);
        }

        if (
          name !== '__webdriver__' &&
          name !== 'log' &&
          name !== 'config' &&
          instance &&
          typeof instance === 'object'
        ) {
          instance = createVerboseInstance(
            this.log,
            type === 'PageObject' ? `PageObjects.${name}` : name,
            instance
          );
        }

        instances.set(provider, instance);
      }

      return instances.get(provider);
    });
  }
}

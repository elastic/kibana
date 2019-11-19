/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ToolingLog } from '@kbn/dev-utils';

import { loadTracer } from '../load_tracer';
import { createAsyncInstance, isAsyncInstance } from './async_instance';
import { Providers } from './read_provider_spec';
import { createVerboseInstance } from './verbose_instance';

export class ProviderCollection {
  private readonly instances = new Map();

  constructor(private readonly log: ToolingLog, private readonly providers: Providers) {}

  public getService = (name: string) => this.getInstance('Service', name);

  public hasService = (name: string) => Boolean(this.findProvider('Service', name));

  public getPageObject = (name: string) => this.getInstance('PageObject', name);

  public getPageObjects = (names: string[]) => {
    const pageObjects: Record<string, any> = {};
    names.forEach(name => (pageObjects[name] = this.getPageObject(name)));
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
    return provider({
      getService: this.getService,
      hasService: this.hasService,
      getPageObject: this.getPageObject,
      getPageObjects: this.getPageObjects,
    });
  }

  private findProvider(type: string, name: string) {
    return this.providers.find(p => p.type === type && p.name === name);
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

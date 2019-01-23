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

import { loadTracer } from '../load_tracer';
import { createAsyncInstance, isAsyncInstance } from './async_instance';
import { createVerboseInstance } from './verbose_instance';

export class ProviderCollection {
  constructor(log, providers) {
    this._log = log;
    this._instances = new Map();
    this._providers = providers;
  }

  getService = name => (
    this._getInstance('Service', name)
  )

  hasService = name => (
    Boolean(this._findProvider('Service', name))
  )

  getPageObject = name => (
    this._getInstance('PageObject', name)
  )

  getPageObjects = names => {
    const pageObjects = {};
    names.forEach(name => pageObjects[name] = this.getPageObject(name));
    return pageObjects;
  }

  loadExternalService(name, provider) {
    return this._getInstance('Service', name, provider);
  }

  async loadAll() {
    const asyncInitFailures = [];

    await Promise.all(
      this._providers.map(async ({ type, name }) => {
        try {
          const instance = this._getInstance(type, name);
          if (isAsyncInstance(instance)) {
            await instance.init();
          }
        } catch (err) {
          this._log.warning('Failure loading service %j', name);
          this._log.error(err);
          asyncInitFailures.push(name);
        }
      })
    );

    if (asyncInitFailures.length) {
      throw new Error(`Failure initializing ${asyncInitFailures.length} service(s)`);
    }
  }

  _findProvider(type, name) {
    return this._providers.find(p => p.type === type && p.name === name);
  }

  _getProvider(type, name) {
    const providerDef = this._findProvider(type, name);
    if (!providerDef) {
      throw new Error(`Unknown ${type} "${name}"`);
    }
    return providerDef.fn;
  }

  _getInstance(type, name, provider = this._getProvider(type, name)) {
    const instances = this._instances;

    return loadTracer(provider, `${type}(${name})`, () => {
      if (!provider) {
        throw new Error(`Unknown ${type} "${name}"`);
      }

      if (!instances.has(provider)) {
        let instance = provider({
          getService: this.getService,
          hasService: this.hasService,
          getPageObject: this.getPageObject,
          getPageObjects: this.getPageObjects,
        });

        if (instance && typeof instance.then === 'function') {
          instance = createAsyncInstance(type, name, instance);
        }

        if (name !== '__leadfoot__' && name !== 'log' && name !== 'config' && instance && typeof instance === 'object') {
          instance = createVerboseInstance(
            this._log,
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

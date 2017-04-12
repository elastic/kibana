import { loadTracer } from '../load_tracer';
import { createAsyncInstance, isAsyncInstance } from './async_instance';

export class ProviderCollection {
  constructor(providers) {
    this._instances = new Map();
    this._providers = providers;
  }

  getService = name => (
    this._getInstance('Service', name)
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
    const asyncInitErrors = [];
    await Promise.all(
      this._providers.map(async ({ type, name }) => {
        try {
          const instance = this._getInstance(type, name);
          if (isAsyncInstance(instance)) {
            await instance.init();
          }
        } catch (err) {
          asyncInitErrors.push(err);
        }
      })
    );

    if (asyncInitErrors.length) {
      // just throw the first, it probably caused the others and if not they
      // will show up once we fix the first, but creating an AggregateError or
      // something seems like overkill
      throw asyncInitErrors[0];
    }
  }

  _getProvider(type, name) {
    const providerDef = this._providers.find(p => p.type === type && p.name === name);
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
          getPageObject: this.getPageObject,
          getPageObjects: this.getPageObjects,
        });

        if (instance && typeof instance.then === 'function') {
          instance = createAsyncInstance(type, name, instance);
        }

        instances.set(provider, instance);
      }

      return instances.get(provider);
    });
  }
}

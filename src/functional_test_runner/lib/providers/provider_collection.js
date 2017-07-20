import { loadTracer } from '../load_tracer';
import { createAsyncInstance, isAsyncInstance } from './async_instance';

export class ProviderCollection {
  constructor(log, providers) {
    this._log = log;
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

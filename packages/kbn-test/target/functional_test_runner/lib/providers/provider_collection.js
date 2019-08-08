"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ProviderCollection = void 0;

var _load_tracer = require("../load_tracer");

var _async_instance = require("./async_instance");

var _verbose_instance = require("./verbose_instance");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class ProviderCollection {
  constructor(log, providers) {
    this.log = log;
    this.providers = providers;

    _defineProperty(this, "instances", new Map());

    _defineProperty(this, "getService", name => this.getInstance('Service', name));

    _defineProperty(this, "hasService", name => Boolean(this.findProvider('Service', name)));

    _defineProperty(this, "getPageObject", name => this.getInstance('PageObject', name));

    _defineProperty(this, "getPageObjects", names => {
      const pageObjects = {};
      names.forEach(name => pageObjects[name] = this.getPageObject(name));
      return pageObjects;
    });
  }

  loadExternalService(name, provider) {
    return this.getInstance('Service', name, provider);
  }

  async loadAll() {
    const asyncInitFailures = [];
    await Promise.all(this.providers.map(async ({
      type,
      name
    }) => {
      try {
        const instance = this.getInstance(type, name);

        if ((0, _async_instance.isAsyncInstance)(instance)) {
          await instance.init();
        }
      } catch (err) {
        this.log.warning('Failure loading service %j', name);
        this.log.error(err);
        asyncInitFailures.push(name);
      }
    }));

    if (asyncInitFailures.length) {
      throw new Error(`Failure initializing ${asyncInitFailures.length} service(s)`);
    }
  }

  findProvider(type, name) {
    return this.providers.find(p => p.type === type && p.name === name);
  }

  getProvider(type, name) {
    const providerDef = this.findProvider(type, name);

    if (!providerDef) {
      throw new Error(`Unknown ${type} "${name}"`);
    }

    return providerDef.fn;
  }

  getInstance(type, name, provider = this.getProvider(type, name)) {
    const instances = this.instances;
    return (0, _load_tracer.loadTracer)(provider, `${type}(${name})`, () => {
      if (!provider) {
        throw new Error(`Unknown ${type} "${name}"`);
      }

      if (!instances.has(provider)) {
        let instance = provider({
          getService: this.getService,
          hasService: this.hasService,
          getPageObject: this.getPageObject,
          getPageObjects: this.getPageObjects
        });

        if (instance && typeof instance.then === 'function') {
          instance = (0, _async_instance.createAsyncInstance)(type, name, instance);
        }

        if (name !== '__webdriver__' && name !== 'log' && name !== 'config' && instance && typeof instance === 'object') {
          instance = (0, _verbose_instance.createVerboseInstance)(this.log, type === 'PageObject' ? `PageObjects.${name}` : name, instance);
        }

        instances.set(provider, instance);
      }

      return instances.get(provider);
    });
  }

}

exports.ProviderCollection = ProviderCollection;
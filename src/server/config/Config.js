let Promise = require('bluebird');
let Joi = require('joi');
let _ = require('lodash');
let { zipObject } = require('lodash');
let override = require('./override');
let pkg = require('requirefrom')('src/utils')('packageJson');

const schema = Symbol('Joi Schema');
const schemaKeys = Symbol('Schema Extensions');
const vals = Symbol('config values');
const pendingSets = Symbol('Pending Settings');

module.exports = class Config {
  constructor(initialSchema, initialSettings) {
    this[schemaKeys] = new Map();

    this[vals] = Object.create(null);
    this[pendingSets] = new Map(_.pairs(_.cloneDeep(initialSettings || {})));

    if (initialSchema) this.extendSchema(initialSchema);
  }

  getPendingSets() {
    return this[pendingSets];
  }

  extendSchema(key, extension) {
    if (key && key.isJoi) {
      return _.each(key._inner.children, (child) => {
        this.extendSchema(child.key, child.schema);
      });
    }

    if (this.has(key)) {
      throw new Error(`Config schema already has key: ${key}`);
    }

    this[schemaKeys].set(key, extension);
    this[schema] = null;

    let initialVals = this[pendingSets].get(key);
    if (initialVals) {
      this.set(key, initialVals);
      this[pendingSets].delete(key);
    } else {
      this._commit(this[vals]);
    }
  }

  removeSchema(key) {
    if (!this[schemaKeys].has(key)) {
      throw new TypeError(`Unknown schema key: ${key}`);
    }

    this[schema] = null;
    this[schemaKeys].delete(key);
    this[pendingSets].delete(key);
    delete this[vals][key];
  }

  resetTo(obj) {
    this._commit(obj);
  }

  set(key, value) {
    // clone and modify the config
    let config = _.cloneDeep(this[vals]);
    if (_.isPlainObject(key)) {
      config = override(config, key);
    } else {
      _.set(config, key, value);
    }

    // attempt to validate the config value
    this._commit(config);
  }

  _commit(newVals) {
    // resolve the current environment
    let env = newVals.env;
    delete newVals.env;
    if (_.isObject(env)) env = env.name;
    if (!env) env = process.env.NODE_ENV || 'production';

    let dev = env === 'development';
    let prod = env === 'production';

    // pass the environment as context so that it can be refed in config
    let context = {
      env: env,
      prod: prod,
      dev: dev,
      notProd: !prod,
      notDev: !dev,
      version: _.get(pkg, 'version'),
      buildNum: dev ? Math.pow(2, 53) - 1 : _.get(pkg, 'build.number', NaN),
      buildSha: dev ? 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' : _.get(pkg, 'build.sha', '')
    };

    if (!context.dev && !context.prod) {
      throw new TypeError(
        `Unexpected environment "${env}", expected one of "development" or "production"`
      );
    }

    let results = Joi.validate(newVals, this.getSchema(), { context });

    if (results.error) {
      throw results.error;
    }

    this[vals] = results.value;
  }

  get(key) {
    if (!key) {
      return _.cloneDeep(this[vals]);
    }

    let value = _.get(this[vals], key);
    if (value === undefined) {
      if (!this.has(key)) {
        throw new Error('Unknown config key: ' + key);
      }
    }
    return _.cloneDeep(value);
  }

  has(key) {
    function has(key, schema, path) {
      path = path || [];
      // Catch the partial paths
      if (path.join('.') === key) return true;
      // Only go deep on inner objects with children
      if (schema._inner.children.length) {
        for (let i = 0; i < schema._inner.children.length; i++) {
          let child = schema._inner.children[i];
          // If the child is an object recurse through it's children and return
          // true if there's a match
          if (child.schema._type === 'object') {
            if (has(key, child.schema, path.concat([child.key]))) return true;
          // if the child matches, return true
          } else if (path.concat([child.key]).join('.') === key) {
            return true;
          }
        }
      }
    }

    if (_.isArray(key)) {
      // TODO: add .has() support for array keys
      key = key.join('.');
    }

    return !!has(key, this.getSchema());
  }

  getSchema() {
    if (!this[schema]) {
      let objKeys = zipObject([...this[schemaKeys]]);
      this[schema] = Joi.object().keys(objKeys).default();
    }

    return this[schema];
  }
};

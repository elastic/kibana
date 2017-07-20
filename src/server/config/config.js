import Joi from 'joi';
import _ from 'lodash';
import override from './override';
import createDefaultSchema from './schema';
import { pkg, unset } from '../../utils';
import { deepCloneWithBuffers as clone } from '../../utils';

const schema = Symbol('Joi Schema');
const schemaExts = Symbol('Schema Extensions');
const vals = Symbol('config values');

module.exports = class Config {
  static withDefaultSchema(settings = {}) {
    return new Config(createDefaultSchema(), settings);
  }

  constructor(initialSchema, initialSettings) {
    this[schemaExts] = Object.create(null);
    this[vals] = Object.create(null);

    this.extendSchema(initialSchema, initialSettings);
  }

  extendSchema(extension, settings, key) {
    if (!extension) {
      return;
    }

    if (!key) {
      return _.each(extension._inner.children, (child) => {
        this.extendSchema(child.schema, _.get(settings, child.key), child.key);
      });
    }

    if (this.has(key)) {
      throw new Error(`Config schema already has key: ${key}`);
    }

    _.set(this[schemaExts], key, extension);
    this[schema] = null;

    this.set(key, settings);
  }

  removeSchema(key) {
    if (!_.has(this[schemaExts], key)) {
      throw new TypeError(`Unknown schema key: ${key}`);
    }

    this[schema] = null;
    unset(this[schemaExts], key);
    unset(this[vals], key);
  }

  resetTo(obj) {
    this._commit(obj);
  }

  set(key, value) {
    // clone and modify the config
    let config = clone(this[vals]);
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

    const dev = env === 'development';
    const prod = env === 'production';

    // pass the environment as context so that it can be refed in config
    const context = {
      env: env,
      prod: prod,
      dev: dev,
      notProd: !prod,
      notDev: !dev,
      version: _.get(pkg, 'version'),
      branch: _.get(pkg, 'branch'),
      buildNum: dev ? Math.pow(2, 53) - 1 : _.get(pkg, 'build.number', NaN),
      buildSha: dev ? 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' : _.get(pkg, 'build.sha', '')
    };

    if (!context.dev && !context.prod) {
      throw new TypeError(
        `Unexpected environment "${env}", expected one of "development" or "production"`
      );
    }

    const results = Joi.validate(newVals, this.getSchema(), {
      context,
      abortEarly: false
    });

    if (results.error) {
      throw results.error;
    }

    this[vals] = results.value;
  }

  get(key) {
    if (!key) {
      return clone(this[vals]);
    }

    const value = _.get(this[vals], key);
    if (value === undefined) {
      if (!this.has(key)) {
        throw new Error('Unknown config key: ' + key);
      }
    }
    return clone(value);
  }

  has(key) {
    function has(key, schema, path) {
      path = path || [];
      // Catch the partial paths
      if (path.join('.') === key) return true;
      // Only go deep on inner objects with children
      if (_.size(schema._inner.children)) {
        for (let i = 0; i < schema._inner.children.length; i++) {
          const child = schema._inner.children[i];
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
      this[schema] = (function convertToSchema(children) {
        let schema = Joi.object().keys({}).default();

        for (const key of Object.keys(children)) {
          const child = children[key];
          const childSchema = _.isPlainObject(child) ? convertToSchema(child) : child;

          if (!childSchema || !childSchema.isJoi) {
            throw new TypeError('Unable to convert configuration definition value to Joi schema: ' + childSchema);
          }

          schema = schema.keys({ [key]: childSchema });
        }

        return schema;
      }(this[schemaExts]));
    }

    return this[schema];
  }
};

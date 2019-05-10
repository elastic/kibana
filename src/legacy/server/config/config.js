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

import Joi from 'joi';
import _ from 'lodash';
import override from './override';
import createDefaultSchema from './schema';
import { getConfig } from '../path';
import { pkg, unset, deepCloneWithBuffers as clone, IS_KIBANA_DISTRIBUTABLE } from '../../utils';

const schema = Symbol('Joi Schema');
const schemaExts = Symbol('Schema Extensions');
const vals = Symbol('config values');

export class Config {
  static withDefaultSchema(settings = {}) {
    const defaultSchema = createDefaultSchema();
    return new Config(defaultSchema, settings);
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
    if (!env) env = 'production';

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
      buildNum: IS_KIBANA_DISTRIBUTABLE ? pkg.build.number : Number.MAX_SAFE_INTEGER,
      buildSha: IS_KIBANA_DISTRIBUTABLE ? pkg.build.sha : 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      dist: IS_KIBANA_DISTRIBUTABLE,
      defaultConfigPath: getConfig(),
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
      const error = new Error(results.error.message);
      error.name = results.error.name;
      error.stack = results.error.stack;
      throw error;
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

  getDefault(key) {
    const schemaKey = Array.isArray(key) ? key.join('.') : key;

    const subSchema = Joi.reach(this.getSchema(), schemaKey);
    if (!subSchema) {
      throw new Error(`Unknown config key: ${key}.`);
    }

    return clone(_.get(Joi.describe(subSchema), 'flags.default'));
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

    if (Array.isArray(key)) {
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
}

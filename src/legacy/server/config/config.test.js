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

import { Config } from './config';
import _ from 'lodash';
import Joi from 'joi';

/**
 * Plugins should defined a config method that takes a joi object. By default
 * it should return a way to disallow config
 *
 * Config should be newed up with a joi schema (containing defaults via joi)
 *
 * let schema = { ... }
 * new Config(schema);
 *
 */

const data = {
  test: {
    hosts: ['host-01', 'host-02'],
    client: {
      type: 'datastore',
      host: 'store-01',
      port: 5050,
    },
  },
};

const schema = Joi.object({
  test: Joi.object({
    enable: Joi.boolean().default(true),
    hosts: Joi.array().items(Joi.string()),
    client: Joi.object({
      type: Joi.string().default('datastore'),
      host: Joi.string(),
      port: Joi.number(),
    }).default(),
    undefValue: Joi.string(),
  }).default(),
}).default();

describe('lib/config/config', function () {
  describe('class Config()', function () {
    describe('constructor', function () {
      it('should not allow any config if the schema is not passed', function () {
        const config = new Config();
        const run = function () {
          config.set('something.enable', true);
        };
        expect(run).toThrow();
      });

      it('should allow keys in the schema', function () {
        const config = new Config(schema);
        const run = function () {
          config.set('test.client.host', 'http://localhost');
        };
        expect(run).not.toThrow();
      });

      it('should not allow keys not in the schema', function () {
        const config = new Config(schema);
        const run = function () {
          config.set('paramNotDefinedInTheSchema', true);
        };
        expect(run).toThrow();
      });

      it('should not allow child keys not in the schema', function () {
        const config = new Config(schema);
        const run = function () {
          config.set('test.client.paramNotDefinedInTheSchema', true);
        };
        expect(run).toThrow();
      });

      it('should set defaults', function () {
        const config = new Config(schema);
        expect(config.get('test.enable')).toBe(true);
        expect(config.get('test.client.type')).toBe('datastore');
      });
    });

    describe('#resetTo(object)', function () {
      let config;
      beforeEach(function () {
        config = new Config(schema);
      });

      it('should reset the config object with new values', function () {
        config.set(data);
        const newData = config.get();
        newData.test.enable = false;
        config.resetTo(newData);
        expect(config.get()).toEqual(newData);
      });
    });

    describe('#has(key)', function () {
      let config;
      beforeEach(function () {
        config = new Config(schema);
      });

      it('should return true for fields that exist in the schema', function () {
        expect(config.has('test.undefValue')).toBe(true);
      });

      it('should return true for partial objects that exist in the schema', function () {
        expect(config.has('test.client')).toBe(true);
      });

      it('should return false for fields that do not exist in the schema', function () {
        expect(config.has('test.client.pool')).toBe(false);
      });
    });

    describe('#set(key, value)', function () {
      let config;

      beforeEach(function () {
        config = new Config(schema);
      });

      it('should use a key and value to set a config value', function () {
        config.set('test.enable', false);
        expect(config.get('test.enable')).toBe(false);
      });

      it('should use an object to set config values', function () {
        const hosts = ['host-01', 'host-02'];
        config.set({ test: { enable: false, hosts: hosts } });
        expect(config.get('test.enable')).toBe(false);
        expect(config.get('test.hosts')).toEqual(hosts);
      });

      it('should use a flatten object to set config values', function () {
        const hosts = ['host-01', 'host-02'];
        config.set({ 'test.enable': false, 'test.hosts': hosts });
        expect(config.get('test.enable')).toBe(false);
        expect(config.get('test.hosts')).toEqual(hosts);
      });

      it('should override values with just the values present', function () {
        const newData = _.cloneDeep(data);
        config.set(data);
        newData.test.enable = false;
        config.set({ test: { enable: false } });
        expect(config.get()).toEqual(newData);
      });

      it('should thow an exception when setting a value with the wrong type', function (done) {
        expect.assertions(4);

        const run = function () {
          config.set('test.enable', 'something');
        };

        try {
          run();
        } catch (err) {
          expect(err).toHaveProperty('name', 'ValidationError');
          expect(err).toHaveProperty(
            'message',
            'child "test" fails because [child "enable" fails because ["enable" must be a boolean]]'
          );
          expect(err).not.toHaveProperty('details');
          expect(err).not.toHaveProperty('_object');
        }

        done();
      });
    });

    describe('#get(key)', function () {
      let config;

      beforeEach(function () {
        config = new Config(schema);
        config.set(data);
      });

      it('should return the whole config object when called without a key', function () {
        const newData = _.cloneDeep(data);
        newData.test.enable = true;
        expect(config.get()).toEqual(newData);
      });

      it('should return the value using dot notation', function () {
        expect(config.get('test.enable')).toBe(true);
      });

      it('should return the clone of partial object using dot notation', function () {
        expect(config.get('test.client')).not.toBe(data.test.client);
        expect(config.get('test.client')).toEqual(data.test.client);
      });

      it('should throw exception for unknown config values', function () {
        const run = function () {
          config.get('test.does.not.exist');
        };
        expect(run).toThrowError(/Unknown config key: test.does.not.exist/);
      });

      it('should not throw exception for undefined known config values', function () {
        const run = function getUndefValue() {
          config.get('test.undefValue');
        };
        expect(run).not.toThrow();
      });
    });

    describe('#getDefault(key)', function () {
      let config;

      beforeEach(function () {
        config = new Config(schema);
        config.set(data);
      });

      describe('dot notation key', function () {
        it('should return undefined if there is no default', function () {
          const hostDefault = config.getDefault('test.client.host');
          expect(hostDefault).toBeUndefined();
        });

        it('should return default if specified', function () {
          const typeDefault = config.getDefault('test.client.type');
          expect(typeDefault).toBe('datastore');
        });

        it('should throw exception for unknown key', function () {
          expect(() => {
            config.getDefault('foo.bar');
          }).toThrowErrorMatchingSnapshot();
        });
      });

      describe('array key', function () {
        it('should return undefined if there is no default', function () {
          const hostDefault = config.getDefault(['test', 'client', 'host']);
          expect(hostDefault).toBeUndefined();
        });

        it('should return default if specified', function () {
          const typeDefault = config.getDefault(['test', 'client', 'type']);
          expect(typeDefault).toBe('datastore');
        });

        it('should throw exception for unknown key', function () {
          expect(() => {
            config.getDefault(['foo', 'bar']);
          }).toThrowErrorMatchingSnapshot();
        });
      });

      it('object schema with no default should return default value for property', function () {
        const noDefaultSchema = Joi.object()
          .keys({
            foo: Joi.array().items(Joi.string().min(1)).default(['bar']),
          })
          .required();

        const config = new Config(noDefaultSchema);
        config.set({
          foo: ['baz'],
        });

        const fooDefault = config.getDefault('foo');
        expect(fooDefault).toEqual(['bar']);
      });

      it('should return clone of the default', function () {
        const schemaWithArrayDefault = Joi.object()
          .keys({
            foo: Joi.array().items(Joi.string().min(1)).default(['bar']),
          })
          .default();

        const config = new Config(schemaWithArrayDefault);
        config.set({
          foo: ['baz'],
        });

        expect(config.getDefault('foo')).not.toBe(config.getDefault('foo'));
        expect(config.getDefault('foo')).toEqual(config.getDefault('foo'));
      });
    });

    describe('#extendSchema(key, schema)', function () {
      let config;
      beforeEach(function () {
        config = new Config(schema);
      });

      it('should allow you to extend the schema at the top level', function () {
        const newSchema = Joi.object({ test: Joi.boolean().default(true) }).default();
        config.extendSchema(newSchema, {}, 'myTest');
        expect(config.get('myTest.test')).toBe(true);
      });

      it('should allow you to extend the schema with a prefix', function () {
        const newSchema = Joi.object({ test: Joi.boolean().default(true) }).default();
        config.extendSchema(newSchema, {}, 'prefix.myTest');
        expect(config.get('prefix')).toEqual({ myTest: { test: true } });
        expect(config.get('prefix.myTest')).toEqual({ test: true });
        expect(config.get('prefix.myTest.test')).toBe(true);
      });

      it('should NOT allow you to extend the schema if something else is there', function () {
        const newSchema = Joi.object({ test: Joi.boolean().default(true) }).default();
        const run = function () {
          config.extendSchema('test', newSchema);
        };
        expect(run).toThrow();
      });
    });

    describe('#removeSchema(key)', function () {
      it('should completely remove the key', function () {
        const config = new Config(
          Joi.object().keys({
            a: Joi.number().default(1),
          })
        );

        expect(config.get('a')).toBe(1);
        config.removeSchema('a');
        expect(() => config.get('a')).toThrowError('Unknown config key');
      });

      it('only removes existing keys', function () {
        const config = new Config(Joi.object());

        expect(() => config.removeSchema('b')).toThrowError('Unknown schema');
      });
    });
  });
});

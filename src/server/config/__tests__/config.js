import Config from '../config';
import expect from 'expect.js';
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

let data = {
  test: {
    hosts: ['host-01', 'host-02'],
    client: {
      type: 'datastore',
      host: 'store-01',
      port: 5050
    }
  }
};

let schema = Joi.object({
  test: Joi.object({
    enable: Joi.boolean().default(true),
    hosts: Joi.array().items(Joi.string()),
    client: Joi.object({
      type: Joi.string().default('datastore'),
      host: Joi.string(),
      port: Joi.number()
    }).default(),
    undefValue: Joi.string()
  }).default()
}).default();

describe('lib/config/config', function () {
  describe('class Config()', function () {

    describe('constructor', function () {

      it('should not allow any config if the schema is not passed', function () {
        let config = new Config();
        let run = function () {
          config.set('something.enable', true);
        };
        expect(run).to.throwException();
      });

      it('should allow keys in the schema', function () {
        let config = new Config(schema);
        let run = function () {
          config.set('test.client.host', 'http://0.0.0.0');
        };
        expect(run).to.not.throwException();
      });

      it('should not allow keys not in the schema', function () {
        let config = new Config(schema);
        let run = function () {
          config.set('paramNotDefinedInTheSchema', true);
        };
        expect(run).to.throwException();
      });

      it('should not allow child keys not in the schema', function () {
        let config = new Config(schema);
        let run = function () {
          config.set('test.client.paramNotDefinedInTheSchema', true);
        };
        expect(run).to.throwException();
      });

      it('should set defaults', function () {
        let config = new Config(schema);
        expect(config.get('test.enable')).to.be(true);
        expect(config.get('test.client.type')).to.be('datastore');
      });

    });

    describe('#resetTo(object)', function () {

      let config;
      beforeEach(function () {
        config = new Config(schema);
      });

      it('should reset the config object with new values', function () {
        config.set(data);
        let newData = config.get();
        newData.test.enable = false;
        config.resetTo(newData);
        expect(config.get()).to.eql(newData);
      });

    });

    describe('#has(key)', function () {

      let config;
      beforeEach(function () {
        config = new Config(schema);
      });

      it('should return true for fields that exist in the schema', function () {
        expect(config.has('test.undefValue')).to.be(true);
      });

      it('should return true for partial objects that exist in the schema', function () {
        expect(config.has('test.client')).to.be(true);
      });

      it('should return false for fields that do not exist in the schema', function () {
        expect(config.has('test.client.pool')).to.be(false);
      });

    });

    describe('#set(key, value)', function () {
      let config;

      beforeEach(function () {
        config = new Config(schema);
      });

      it('should use a key and value to set a config value', function () {
        config.set('test.enable', false);
        expect(config.get('test.enable')).to.be(false);
      });

      it('should use an object to set config values', function () {
        let hosts = ['host-01', 'host-02'];
        config.set({ test: { enable: false, hosts: hosts } });
        expect(config.get('test.enable')).to.be(false);
        expect(config.get('test.hosts')).to.eql(hosts);
      });

      it('should use a flatten object to set config values', function () {
        let hosts = ['host-01', 'host-02'];
        config.set({ 'test.enable': false, 'test.hosts': hosts });
        expect(config.get('test.enable')).to.be(false);
        expect(config.get('test.hosts')).to.eql(hosts);
      });

      it('should override values with just the values present', function () {
        let newData = _.cloneDeep(data);
        config.set(data);
        newData.test.enable = false;
        config.set({ test: { enable: false } });
        expect(config.get()).to.eql(newData);
      });

      it('should thow an exception when setting a value with the wrong type', function (done) {
        let run = function () {
          config.set('test.enable', 'something');
        };
        expect(run).to.throwException(function (err) {
          expect(err).to.have.property('name', 'ValidationError');
          expect(err.details[0].message).to.be('"enable" must be a boolean');
          done();
        });
      });


    });

    describe('#get(key)', function () {

      let config;

      beforeEach(function () {
        config = new Config(schema);
        config.set(data);
      });

      it('should return the whole config object when called without a key', function () {
        let newData = _.cloneDeep(data);
        newData.test.enable = true;
        expect(config.get()).to.eql(newData);
      });

      it('should return the value using dot notation', function () {
        expect(config.get('test.enable')).to.be(true);
      });

      it('should return the clone of partial object using dot notation', function () {
        expect(config.get('test.client')).to.not.be(data.test.client);
        expect(config.get('test.client')).to.eql(data.test.client);
      });

      it('should throw exception for unknown config values', function () {
        let run = function () {
          config.get('test.does.not.exist');
        };
        expect(run).to.throwException(/Unknown config key: test.does.not.exist/);
      });

      it('should not throw exception for undefined known config values', function () {
        let run = function getUndefValue() {
          config.get('test.undefValue');
        };
        expect(run).to.not.throwException();
      });

    });

    describe('#extendSchema(key, schema)', function () {
      let config;
      beforeEach(function () {
        config = new Config(schema);
      });

      it('should allow you to extend the schema at the top level', function () {
        let newSchema = Joi.object({ test: Joi.boolean().default(true) }).default();
        config.extendSchema('myTest', newSchema);
        expect(config.get('myTest.test')).to.be(true);
      });

      it('should allow you to extend the schema with a prefix', function () {
        let newSchema = Joi.object({ test: Joi.boolean().default(true) }).default();
        config.extendSchema('prefix.myTest', newSchema);
        expect(config.get('prefix')).to.eql({ myTest: { test: true }});
        expect(config.get('prefix.myTest')).to.eql({ test: true });
        expect(config.get('prefix.myTest.test')).to.be(true);
      });

      it('should NOT allow you to extend the schema if somethign else is there', function () {
        let newSchema = Joi.object({ test: Joi.boolean().default(true) }).default();
        let run = function () {
          config.extendSchema('test', newSchema);
        };
        expect(run).to.throwException();
      });

    });

    describe('#removeSchema(key)', function () {
      it('should completely remove the key', function () {
        let config = new Config(Joi.object().keys({
          a: Joi.number().default(1)
        }));

        expect(config.get('a')).to.be(1);
        config.removeSchema('a');
        expect(() => config.get('a')).to.throwException('Unknown config key');
      });

      it('only removes existing keys', function () {
        let config = new Config(Joi.object());

        expect(() => config.removeSchema('b')).to.throwException('Unknown schema');
      });
    });

  });
});

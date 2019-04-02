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

import expect from '@kbn/expect';
import { errors as esErrors } from 'elasticsearch';
import Chance from 'chance';
import sinon from 'sinon';

import { UiSettingsService } from '../ui_settings_service';
import * as createOrUpgradeSavedConfigNS from '../create_or_upgrade_saved_config/create_or_upgrade_saved_config';
import {
  createObjectsClientStub,
  savedObjectsClientErrors,
} from './lib';

const TYPE = 'config';
const ID = 'kibana-version';
const BUILD_NUM = 1234;
const chance = new Chance();

describe('ui settings', () => {
  const sandbox = sinon.createSandbox();

  function setup(options = {}) {
    const {
      getDefaults,
      defaults = {},
      overrides,
      esDocSource = {},
      savedObjectsClient = createObjectsClientStub(TYPE, ID, esDocSource)
    } = options;

    const uiSettings = new UiSettingsService({
      type: TYPE,
      id: ID,
      buildNum: BUILD_NUM,
      getDefaults: getDefaults || (() => defaults),
      savedObjectsClient,
      overrides,
    });

    const createOrUpgradeSavedConfig = sandbox.stub(createOrUpgradeSavedConfigNS, 'createOrUpgradeSavedConfig');

    return {
      uiSettings,
      savedObjectsClient,
      createOrUpgradeSavedConfig,
      assertGetQuery: savedObjectsClient.assertGetQuery,
      assertUpdateQuery: savedObjectsClient.assertUpdateQuery,
    };
  }

  afterEach(() => sandbox.restore());

  describe('#setMany()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.setMany({ a: 'b' })).to.be.a(Promise);
    });

    it('updates a single value in one operation', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.setMany({ one: 'value' });
      savedObjectsClient.assertUpdateQuery({ one: 'value' });
    });

    it('updates several values in one operation', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.setMany({ one: 'value', another: 'val' });
      savedObjectsClient.assertUpdateQuery({ one: 'value', another: 'val' });
    });

    it('automatically creates the savedConfig if it is missing', async () => {
      const { uiSettings, savedObjectsClient, createOrUpgradeSavedConfig } = setup();
      savedObjectsClient.update
        .onFirstCall()
        .throws(savedObjectsClientErrors.createGenericNotFoundError())
        .onSecondCall()
        .returns({});

      await uiSettings.setMany({ foo: 'bar' });
      sinon.assert.calledTwice(savedObjectsClient.update);
      sinon.assert.calledOnce(createOrUpgradeSavedConfig);
    });

    it('only tried to auto create once and throws NotFound', async () => {
      const { uiSettings, savedObjectsClient, createOrUpgradeSavedConfig } = setup();
      savedObjectsClient.update.throws(savedObjectsClientErrors.createGenericNotFoundError());

      try {
        await uiSettings.setMany({ foo: 'bar' });
        throw new Error('expected setMany to throw a NotFound error');
      } catch (error) {
        expect(savedObjectsClientErrors.isNotFoundError(error)).to.be(true);
      }

      sinon.assert.calledTwice(savedObjectsClient.update);
      sinon.assert.calledOnce(createOrUpgradeSavedConfig);
    });

    it('throws an error if any key is overridden', async () => {
      const { uiSettings } = setup({
        overrides: {
          foo: 'bar'
        }
      });

      try {
        await uiSettings.setMany({
          bar: 'box',
          foo: 'baz'
        });
      } catch (error) {
        expect(error.message).to.be('Unable to update "foo" because it is overridden');
      }
    });
  });

  describe('#set()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.set('a', 'b')).to.be.a(Promise);
    });

    it('updates single values by (key, value)', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.set('one', 'value');
      savedObjectsClient.assertUpdateQuery({ one: 'value' });
    });

    it('throws an error if the key is overridden', async () => {
      const { uiSettings } = setup({
        overrides: {
          foo: 'bar'
        }
      });

      try {
        await uiSettings.set('foo', 'baz');
      } catch (error) {
        expect(error.message).to.be('Unable to update "foo" because it is overridden');
      }
    });
  });

  describe('#remove()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.remove('one')).to.be.a(Promise);
    });

    it('removes single values by key', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.remove('one');
      savedObjectsClient.assertUpdateQuery({ one: null });
    });

    it('throws an error if the key is overridden', async () => {
      const { uiSettings } = setup({
        overrides: {
          foo: 'bar'
        }
      });

      try {
        await uiSettings.remove('foo');
      } catch (error) {
        expect(error.message).to.be('Unable to update "foo" because it is overridden');
      }
    });
  });

  describe('#removeMany()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.removeMany(['one'])).to.be.a(Promise);
    });

    it('removes a single value', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.removeMany(['one']);
      savedObjectsClient.assertUpdateQuery({ one: null });
    });

    it('updates several values in one operation', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.removeMany(['one', 'two', 'three']);
      savedObjectsClient.assertUpdateQuery({ one: null, two: null, three: null });
    });

    it('throws an error if any key is overridden', async () => {
      const { uiSettings } = setup({
        overrides: {
          foo: 'bar'
        }
      });

      try {
        await uiSettings.setMany(['bar', 'foo']);
      } catch (error) {
        expect(error.message).to.be('Unable to update "foo" because it is overridden');
      }
    });
  });

  describe('#getDefaults()', () => {
    it('returns a promise for the defaults', async () => {
      const { uiSettings } = setup();
      const promise = uiSettings.getDefaults();
      expect(promise).to.be.a(Promise);
      expect(await promise).to.eql({});
    });
  });

  describe('getDefaults() argument', () => {
    it('casts sync `getDefaults()` to promise', () => {
      const getDefaults = () => ({ key: { value: chance.word() } });
      const { uiSettings } = setup({ getDefaults });
      expect(uiSettings.getDefaults()).to.be.a(Promise);
    });

    it('returns the defaults returned by getDefaults() argument', async () => {
      const value = chance.word();
      const { uiSettings } = setup({ defaults: { key: { value } } });
      expect(await uiSettings.getDefaults()).to.eql({
        key: { value }
      });
    });
  });

  describe('#getUserProvided()', () => {
    it('pulls user configuration from ES', async () => {
      const { uiSettings, savedObjectsClient } = setup();
      await uiSettings.getUserProvided();
      savedObjectsClient.assertGetQuery();
    });

    it('returns user configuration', async () => {
      const esDocSource = { user: 'customized' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getUserProvided();
      expect(result).to.eql({
        user: {
          userValue: 'customized',
        }
      });
    });

    it('ignores null user configuration (because default values)', async () => {
      const esDocSource = { user: 'customized', usingDefault: null, something: 'else' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getUserProvided();
      expect(result).to.eql({
        user: {
          userValue: 'customized'
        },
        something: {
          userValue: 'else'
        }
      });
    });

    it('returns an empty object on 404 responses', async () => {
      const { uiSettings } = setup({
        async callCluster() {
          throw new esErrors[404]();
        }
      });

      expect(await uiSettings.getUserProvided()).to.eql({});
    });

    it('returns an empty object on 403 responses', async () => {
      const { uiSettings } = setup({
        async callCluster() {
          throw new esErrors[403]();
        }
      });

      expect(await uiSettings.getUserProvided()).to.eql({});
    });

    it('returns an empty object on NoConnections responses', async () => {
      const { uiSettings } = setup({
        async callCluster() {
          throw new esErrors.NoConnections();
        }
      });

      expect(await uiSettings.getUserProvided()).to.eql({});
    });

    it('throws 401 errors', async () => {
      const { uiSettings } = setup({
        savedObjectsClient: {
          errors: savedObjectsClientErrors,
          async get() {
            throw new esErrors[401]();
          }
        }
      });

      try {
        await uiSettings.getUserProvided();
        throw new Error('expect getUserProvided() to throw');
      } catch (err) {
        expect(err).to.be.a(esErrors[401]);
      }
    });

    it('throw when callCluster fails in some unexpected way', async () => {
      const expectedUnexpectedError = new Error('unexpected');

      const { uiSettings } = setup({
        savedObjectsClient: {
          errors: savedObjectsClientErrors,
          async get() {
            throw expectedUnexpectedError;
          }
        }
      });

      try {
        await uiSettings.getUserProvided();
        throw new Error('expect getUserProvided() to throw');
      } catch (err) {
        expect(err).to.be(expectedUnexpectedError);
      }
    });

    it('includes overridden values for overridden keys', async () => {
      const esDocSource = {
        user: 'customized'
      };

      const overrides = {
        foo: 'bar'
      };

      const { uiSettings } = setup({ esDocSource, overrides });
      expect(await uiSettings.getUserProvided()).to.eql({
        user: {
          userValue: 'customized',
        },
        foo: {
          userValue: 'bar',
          isOverridden: true,
        },
      });
    });
  });

  describe('#getRaw()', () => {
    it('pulls user configuration from ES', async () => {
      const esDocSource = {};
      const { uiSettings, savedObjectsClient } = setup({ esDocSource });
      await uiSettings.getRaw();
      savedObjectsClient.assertGetQuery();
    });

    it(`without user configuration it's equal to the defaults`, async () => {
      const esDocSource = {};
      const defaults = { key: { value: chance.word() } };
      const { uiSettings } = setup({ esDocSource, defaults });
      const result = await uiSettings.getRaw();
      expect(result).to.eql(defaults);
    });

    it(`user configuration gets merged with defaults`, async () => {
      const esDocSource = { foo: 'bar' };
      const defaults = { key: { value: chance.word() } };
      const { uiSettings } = setup({ esDocSource, defaults });
      const result = await uiSettings.getRaw();

      expect(result).to.eql({
        foo: {
          userValue: 'bar',
        },
        key: {
          value: defaults.key.value,
        },
      });
    });

    it('includes the values for overridden keys', async () => {
      const esDocSource = { foo: 'bar' };
      const defaults = { key: { value: chance.word() } };
      const overrides = { foo: true };
      const { uiSettings } = setup({ esDocSource, defaults, overrides });
      const result = await uiSettings.getRaw();

      expect(result).to.eql({
        foo: {
          userValue: true,
          isOverridden: true,
        },
        key: {
          value: defaults.key.value,
        },
      });
    });
  });

  describe('#getAll()', () => {
    it('pulls user configuration from ES', async () => {
      const esDocSource = {};
      const { uiSettings, savedObjectsClient } = setup({ esDocSource });
      await uiSettings.getAll();
      savedObjectsClient.assertGetQuery();
    });

    it(`returns defaults when es doc is empty`, async () => {
      const esDocSource = { };
      const defaults = { foo: { value: 'bar' } };
      const { uiSettings } = setup({ esDocSource, defaults });
      expect(await uiSettings.getAll()).to.eql({
        foo: 'bar'
      });
    });

    it(`merges user values, including ones without defaults, into key value pairs`, async () => {
      const esDocSource = {
        foo: 'user-override',
        bar: 'user-provided',
      };

      const defaults = {
        foo: {
          value: 'default'
        },
      };

      const { uiSettings } = setup({ esDocSource, defaults });
      expect(await uiSettings.getAll()).to.eql({
        foo: 'user-override',
        bar: 'user-provided',
      });
    });

    it('includes the values for overridden keys', async () => {
      const esDocSource = {
        foo: 'user-override',
        bar: 'user-provided',
      };

      const defaults = {
        foo: {
          value: 'default'
        },
      };

      const overrides = {
        foo: 'bax'
      };

      const { uiSettings } = setup({ esDocSource, defaults, overrides });
      expect(await uiSettings.getAll()).to.eql({
        foo: 'bax',
        bar: 'user-provided',
      });
    });
  });

  describe('#get()', () => {
    it('pulls user configuration from ES', async () => {
      const esDocSource = {};
      const { uiSettings, savedObjectsClient } = setup({ esDocSource });
      await uiSettings.get();
      savedObjectsClient.assertGetQuery();
    });

    it(`returns the promised value for a key`, async () => {
      const esDocSource = {};
      const defaults = { dateFormat: { value: chance.word() } };
      const { uiSettings } = setup({ esDocSource, defaults });
      const result = await uiSettings.get('dateFormat');
      expect(result).to.equal(defaults.dateFormat.value);
    });

    it(`returns the user-configured value for a custom key`, async () => {
      const esDocSource = { custom: 'value' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.get('custom');
      expect(result).to.equal('value');
    });

    it(`returns the user-configured value for a modified key`, async () => {
      const esDocSource = { dateFormat: 'YYYY-MM-DD' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.get('dateFormat');
      expect(result).to.equal('YYYY-MM-DD');
    });

    it('returns the overridden value for an overrided key', async () => {
      const esDocSource = { dateFormat: 'YYYY-MM-DD' };
      const overrides = { dateFormat: 'foo' };
      const { uiSettings } = setup({ esDocSource, overrides });
      expect(await uiSettings.get('dateFormat')).to.be('foo');
    });

    it('returns the default value for an override with value null', async () => {
      const esDocSource = { dateFormat: 'YYYY-MM-DD' };
      const overrides = { dateFormat: null };
      const defaults = { dateFormat: { value: 'foo' } };
      const { uiSettings } = setup({ esDocSource, overrides, defaults });
      expect(await uiSettings.get('dateFormat')).to.be('foo');
    });

    it('returns the overridden value if the document does not exist', async () => {
      const overrides = { dateFormat: 'foo' };
      const { uiSettings, savedObjectsClient } = setup({ overrides });
      savedObjectsClient.get.onFirstCall().throws(savedObjectsClientErrors.createGenericNotFoundError());
      expect(await uiSettings.get('dateFormat')).to.be('foo');
    });
  });

  describe('#isOverridden()', () => {
    it('returns false if no overrides defined', () => {
      const { uiSettings } = setup();
      expect(uiSettings.isOverridden('foo')).to.be(false);
    });
    it('returns false if overrides defined but key is not included', () => {
      const { uiSettings } = setup({ overrides: { foo: true, bar: true } });
      expect(uiSettings.isOverridden('baz')).to.be(false);
    });
    it('returns false for object prototype properties', () => {
      const { uiSettings } = setup({ overrides: { foo: true, bar: true } });
      expect(uiSettings.isOverridden('hasOwnProperty')).to.be(false);
    });
    it('returns true if overrides defined and key is overridden', () => {
      const { uiSettings } = setup({ overrides: { foo: true, bar: true } });
      expect(uiSettings.isOverridden('bar')).to.be(true);
    });
  });

  describe('#assertUpdateAllowed()', () => {
    it('returns false if no overrides defined', () => {
      const { uiSettings } = setup();
      expect(uiSettings.assertUpdateAllowed('foo')).to.be(undefined);
    });
    it('throws 400 Boom error when keys is overridden', () => {
      const { uiSettings } = setup({ overrides: { foo: true } });
      expect(() => uiSettings.assertUpdateAllowed('foo')).to.throwError(error => {
        expect(error).to.have.property('message', 'Unable to update "foo" because it is overridden');
        expect(error).to.have.property('isBoom', true);
        expect(error.output).to.have.property('statusCode', 400);
      });
    });
  });
});

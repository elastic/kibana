import expect from 'expect.js';
import ngMock from 'ng_mock';

import { Notifier } from 'ui/notify';

describe('config component', function () {
  let config;
  let $scope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector) {
    config = $injector.get('config');
    $scope = $injector.get('$rootScope');
  }));

  describe('#get', function () {
    it('gives access to config values', function () {
      expect(config.get('dateFormat')).to.be.a('string');
    });

    it('supports the default value overload', function () {
      // default values are consumed and returned atomically
      expect(config.get('obscureProperty1', 'default')).to.be('default');
    });

    it('after a get for an unknown property, the property is not persisted', function () {
      const throwaway = config.get('obscureProperty2', 'default'); //eslint-disable-line no-unused-vars
      // after a get, default values are NOT persisted
      expect(config.get).withArgs('obscureProperty2').to.throwException();
    });

    it('honors the default parameter for unset options that are exported', () => {
      // if you are hitting this error, then a test is setting this config value globally and not unsetting it!
      expect(config.isDefault('dateFormat')).to.be(true);

      const defaultDateFormat = config.get('dateFormat');

      expect(config.get('dateFormat', 'xyz')).to.be('xyz');
      // shouldn't change other usages
      expect(config.get('dateFormat')).to.be(defaultDateFormat);
      expect(config.get('dataFormat', defaultDateFormat)).to.be(defaultDateFormat);
    });

    it('throws on unknown properties that don\'t have a value yet.', function () {
      const msg = 'Unexpected `config.get("throwableProperty")` call on unrecognized configuration setting';
      expect(config.get).withArgs('throwableProperty').to.throwException(msg);
    });
  });

  describe('#set', function () {
    it('stores a value in the config val set', function () {
      const original = config.get('dateFormat');
      config.set('dateFormat', 'notaformat');
      expect(config.get('dateFormat')).to.be('notaformat');
      config.set('dateFormat', original);
    });

    it('stores a value in a previously unknown config key', function () {
      expect(config.set).withArgs('unrecognizedProperty', 'somevalue').to.not.throwException();
      expect(config.get('unrecognizedProperty')).to.be('somevalue');
    });
  });

  describe('#$bind', function () {

    it('binds a config key to a $scope property', function () {
      const dateFormat = config.get('dateFormat');
      config.bindToScope($scope, 'dateFormat');
      expect($scope).to.have.property('dateFormat', dateFormat);
    });

    it('allows overriding the property name', function () {
      const dateFormat = config.get('dateFormat');
      config.bindToScope($scope, 'dateFormat', 'defaultDateFormat');
      expect($scope).to.not.have.property('dateFormat');
      expect($scope).to.have.property('defaultDateFormat', dateFormat);
    });

    it('keeps the property up to date', function () {
      const original = config.get('dateFormat');
      const newDateFormat = original + ' NEW NEW NEW!';
      config.bindToScope($scope, 'dateFormat');

      expect($scope).to.have.property('dateFormat', original);
      config.set('dateFormat', newDateFormat);
      expect($scope).to.have.property('dateFormat', newDateFormat);
      config.set('dateFormat', original);

    });

  });

  describe('#_change', () => {

    it('returns true for success', async () => {
      // immediately resolve to avoid timing issues
      const delayedUpdate = () => Promise.resolve();

      expect(await config._change('expect_true', 'value', { _delayedUpdate: delayedUpdate })).to.be(true);
      // setting to the same should set it to true as well
      expect(await config._change('expect_true', 'value')).to.be(true);

      config.remove('expect_true');
    });

    it('returns false for failure', async () => {
      const message = 'TEST - _change - EXPECTED';
      // immediately resolve to avoid timing issues
      const delayedUpdate = () => Promise.reject(new Error(message));

      expect(await config._change('expected_false', 'value', { _delayedUpdate: delayedUpdate })).to.be(false);

      // cleanup the notification so that the test harness does not complain
      const notif = Notifier.prototype._notifs.find(notif => notif.content.indexOf(message) !== -1);
      notif.clear();
    });

  });

});

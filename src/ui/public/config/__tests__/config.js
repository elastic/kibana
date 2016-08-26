import expect from 'expect.js';
import ngMock from 'ng_mock';

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
      expect(config.get('obscureProperty', 'default')).to.be('default');
      // default values are consumed only if setting was previously unset
      expect(config.get('obscureProperty', 'another')).to.be('default');
      // default values are persisted
      expect(config.get('obscureProperty')).to.be('default');
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

    it('alows overriding the property name', function () {
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

});

import expect from 'expect.js';
import ngMock from 'ng_mock';
import ConfigDefaultsProvider from 'ui/config/defaults';
describe('config component', function () {
  let $scope;
  let config;
  let defaults;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector, Private) {
    config = $injector.get('config');
    $scope = $injector.get('$rootScope');
    defaults = Private(ConfigDefaultsProvider);
  }));

  describe('#get', function () {

    it('gives access to config values', function () {
      expect(config.get('dateFormat')).to.be.a('string');
    });

    it('reads from the defaults', function () {
      let initial = config.get('dateFormat');
      let newDefault = initial + '- new';
      defaults.dateFormat.value = newDefault;
      expect(config.get('dateFormat')).to.be(newDefault);
    });

  });

  describe('#set', function () {

    it('stores a value in the config val set', function () {
      let initial = config.get('dateFormat');
      config.set('dateFormat', 'notaformat');
      expect(config.get('dateFormat')).to.be('notaformat');
    });

  });

  describe('#$bind', function () {

    it('binds a config key to a $scope property', function () {
      let dateFormat = config.get('dateFormat');
      config.$bind($scope, 'dateFormat');
      expect($scope).to.have.property('dateFormat', dateFormat);
    });

    it('alows overriding the property name', function () {
      let dateFormat = config.get('dateFormat');
      config.$bind($scope, 'dateFormat', 'defaultDateFormat');
      expect($scope).to.not.have.property('dateFormat');
      expect($scope).to.have.property('defaultDateFormat', dateFormat);
    });

    it('keeps the property up to date', function () {
      let dateFormat = config.get('dateFormat');
      let newDateFormat = dateFormat + ' NEW NEW NEW!';
      config.$bind($scope, 'dateFormat');

      expect($scope).to.have.property('dateFormat', dateFormat);
      config.set('dateFormat', newDateFormat);
      expect($scope).to.have.property('dateFormat', newDateFormat);

    });

  });

});

import expect from 'expect.js';
import ngMock from 'ng_mock';

describe('config component', function () {
  let config;
  let $scope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($injector, Private) {
    config = $injector.get('config');
    $scope = $injector.get('$rootScope');
  }));

  describe('#get', function () {

    it('gives access to config values', function () {
      expect(config.get('dateFormat')).to.be.a('string');
    });
  });

  describe('#set', function () {

    it('stores a value in the config val set', function () {
      const original = config.get('dateFormat');
      config.set('dateFormat', 'notaformat');
      expect(config.get('dateFormat')).to.be('notaformat');
      config.set('dateFormat', original);
    });

  });

  describe('#$bind', function () {

    it('binds a config key to a $scope property', function () {
      const dateFormat = config.get('dateFormat');
      config.$bind($scope, 'dateFormat');
      expect($scope).to.have.property('dateFormat', dateFormat);
    });

    it('alows overriding the property name', function () {
      const dateFormat = config.get('dateFormat');
      config.$bind($scope, 'dateFormat', 'defaultDateFormat');
      expect($scope).to.not.have.property('dateFormat');
      expect($scope).to.have.property('defaultDateFormat', dateFormat);
    });

    it('keeps the property up to date', function () {
      const original = config.get('dateFormat');
      const newDateFormat = original + ' NEW NEW NEW!';
      config.$bind($scope, 'dateFormat');

      expect($scope).to.have.property('dateFormat', original);
      config.set('dateFormat', newDateFormat);
      expect($scope).to.have.property('dateFormat', newDateFormat);
      config.set('dateFormat', original);

    });

  });

});

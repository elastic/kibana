import expect from 'expect.js';
import sinon from 'sinon';

import ngMock from 'ng_mock';
import chrome from '../../chrome';

describe('Config service', () => {
  let config;
  let uiSettings;
  let $q;
  let $rootScope;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(($injector) => {
    config = $injector.get('config');
    uiSettings = chrome.getUiSettingsClient();
    $q = $injector.get('$q');
    $rootScope = $injector.get('$rootScope');
  }));

  describe('#getAll', () => {
    it('calls uiSettings.getAll()', () => {
      sinon.stub(uiSettings, 'getAll');
      config.getAll();
      sinon.assert.calledOnce(uiSettings.getAll);
      sinon.assert.calledWithExactly(uiSettings.getAll);
    });
  });

  describe('#get', () => {
    it('calls uiSettings.get(key, default)', () => {
      sinon.stub(uiSettings, 'get');
      config.get('key', 'default');
      sinon.assert.calledOnce(uiSettings.get);
      sinon.assert.calledWithExactly(uiSettings.get, 'key', 'default');
    });
  });

  describe('#isDeclared', () => {
    it('calls uiSettings.isDeclared(key)', () => {
      sinon.stub(uiSettings, 'isDeclared');
      config.isDeclared('key');
      sinon.assert.calledOnce(uiSettings.isDeclared);
      sinon.assert.calledWithExactly(uiSettings.isDeclared, 'key');
    });
  });

  describe('#isDefault', () => {
    it('calls uiSettings.isDefault(key)', () => {
      sinon.stub(uiSettings, 'isDefault');
      config.isDefault('key');
      sinon.assert.calledOnce(uiSettings.isDefault);
      sinon.assert.calledWithExactly(uiSettings.isDefault, 'key');
    });
  });

  describe('#isCustom', () => {
    it('calls uiSettings.isCustom(key)', () => {
      sinon.stub(uiSettings, 'isCustom');
      config.isCustom('key');
      sinon.assert.calledOnce(uiSettings.isCustom);
      sinon.assert.calledWithExactly(uiSettings.isCustom, 'key');
    });
  });

  describe('#remove', () => {
    it('calls uiSettings.remove(key)', () => {
      sinon.stub(uiSettings, 'remove');
      config.remove('foobar');
      sinon.assert.calledOnce(uiSettings.remove);
      sinon.assert.calledWithExactly(uiSettings.remove, 'foobar');
    });

    it('returns an angular promise', () => {
      const promise = config.remove('dateFormat:tz');
      expect(promise).to.be.a($q);
    });
  });

  describe('#set', () => {
    it('returns an angular promise', () => {
      const promise = config.set('dateFormat:tz', 'foo');
      expect(promise).to.be.a($q);
    });

    it('strips $$-prefixed properties from plain objects', () => {
      config.set('dateFormat:scaled', {
        foo: 'bar',
        $$bax: 'box'
      });

      expect(config.get('dateFormat:scaled')).to.eql({
        foo: 'bar'
      });
    });
  });

  describe('$scope events', () => {
    it('synchronously emits change:config on $rootScope when config changes', () => {
      const stub = sinon.stub();
      $rootScope.$on('change:config', stub);
      config.set('foobar', 'baz');
      sinon.assert.calledOnce(stub);
      sinon.assert.calledWithExactly(stub, sinon.match({}), 'baz', undefined, 'foobar', config);
    });

    it('synchronously emits change:config.${key} on $rootScope when config changes', () => {
      const stub = sinon.stub();
      $rootScope.$on('change:config.foobar', stub);
      config.set('foobar', 'baz');
      sinon.assert.calledOnce(stub);
      sinon.assert.calledWithExactly(stub, sinon.match({}), 'baz', undefined, 'foobar', config);
    });

    it('synchronously emits change:config on child scope when config changes', () => {
      const stub = sinon.stub();
      const $parent = $rootScope.$new(false);
      const $scope = $rootScope.$new(false, $parent);
      $scope.$on('change:config', stub);
      config.set('foobar', 'baz');
      sinon.assert.calledOnce(stub);
      sinon.assert.calledWithExactly(stub, sinon.match({}), 'baz', undefined, 'foobar', config);
    });

    it('synchronously emits change:config.${key} on child scope when config changes', () => {
      const stub = sinon.stub();
      const $parent = $rootScope.$new(false);
      const $scope = $rootScope.$new(false, $parent);
      $scope.$on('change:config.foobar', stub);
      config.set('foobar', 'baz');
      sinon.assert.calledOnce(stub);
      sinon.assert.calledWithExactly(stub, sinon.match({}), 'baz', undefined, 'foobar', config);
    });

    it('synchronously emits change:config on isolate scope when config changes', () => {
      const stub = sinon.stub();
      const $scope = $rootScope.$new(true);
      $scope.$on('change:config', stub);
      config.set('foobar', 'baz');
      sinon.assert.calledOnce(stub);
      sinon.assert.calledWithExactly(stub, sinon.match({}), 'baz', undefined, 'foobar', config);
    });

    it('synchronously emits change:config.${key} on isolate scope when config changes', () => {
      const stub = sinon.stub();
      const $scope = $rootScope.$new(true);
      $scope.$on('change:config.foobar', stub);
      config.set('foobar', 'baz');
      sinon.assert.calledOnce(stub);
      sinon.assert.calledWithExactly(stub, sinon.match({}), 'baz', undefined, 'foobar', config);
    });

    it('synchronously emits events when changes are inside a digest cycle', async () => {
      const stub = sinon.stub();

      $rootScope.$apply(() => {
        $rootScope.$on('change:config.foobar', stub);
        config.set('foobar', 'baz');
      });

      sinon.assert.calledOnce(stub);
      sinon.assert.calledWithExactly(stub, sinon.match({}), 'baz', undefined, 'foobar', config);
    });

    it('synchronously emits events when changes are outside a digest cycle', async () => {
      const stub = sinon.stub();

      await new Promise((resolve) => {
        setTimeout(function () {
          const off = $rootScope.$on('change:config.foobar', stub);
          config.set('foobar', 'baz');
          // we unlisten to make sure that stub is not called before our assetions below
          off();
          resolve();
        }, 0);
      });

      sinon.assert.calledOnce(stub);
      sinon.assert.calledWithExactly(stub, sinon.match({}), 'baz', undefined, 'foobar', config);
    });
  });
});

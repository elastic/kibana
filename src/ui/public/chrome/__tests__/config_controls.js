import ngMock from 'ngMock';
import $ from 'jquery';
import expect from 'expect.js';

import uiModules from 'ui/modules';
import chromeConfigControlsRegistry from 'ui/registry/chrome_config_controls';
import Registry from 'ui/registry/_registry';
import 'ui/chrome/directives/config_controls';
import 'ui/directives/config';

describe('chrome config controls', function () {
  let compile;
  let stubRegistry;

  beforeEach(ngMock.module('kibana', function (PrivateProvider) {
    stubRegistry = new Registry({
      order: ['order']
    });

    PrivateProvider.swap(chromeConfigControlsRegistry, stubRegistry);
  }));

  beforeEach(ngMock.inject(function ($compile, $rootScope) {
    compile = function () {
      const $el = $('<kbn-chrome-config-controls></kbn-chrome-config-controls>');
      let $scope = $rootScope.$new();
      $compile($el)($scope);
      $scope.$digest();
      return $el;
    };
  }));

  it('injects configs from the ui/registry/chrome_config_controls registry', function () {
    stubRegistry.register(function () {
      return {
        name: 'control1',
        order: 1,
        config: {
        }
      };
    });
    stubRegistry.register(function () {
      return {
        name: 'control2',
        order: 2,
        config: {
        }
      };
    });

    var $el = compile();
    expect($el.find('config')).to.have.length(2);
  });
});

import ngMock from 'ngMock';
import $ from 'jquery';
import expect from 'expect.js';

import uiModules from 'ui/modules';
import chromeNavControlsRegistry from 'ui/registry/chrome_nav_controls';
import chromeConfigControlsRegistry from 'ui/registry/chrome_config_controls';
import Registry from 'ui/registry/_registry';

describe('chrome nav controls', function () {
  let compile;
  let stubNavRegistry;
  let stubConfigRegistry;

  beforeEach(ngMock.module('kibana', function (PrivateProvider) {
    stubNavRegistry = new Registry({
      order: ['order']
    });

    PrivateProvider.swap(chromeNavControlsRegistry, stubNavRegistry);

    stubConfigRegistry = new Registry({
      order: ['order']
    });

    PrivateProvider.swap(chromeConfigControlsRegistry, stubConfigRegistry);
  }));

  beforeEach(ngMock.inject(function ($compile, $rootScope) {
    compile = function () {
      const $el = $('<div kbn-chrome-append-nav-controls>');
      $rootScope.$apply();
      $compile($el)($rootScope);
      return $el;
    };
  }));

  it('injects templates from the ui/registry/chrome_nav_controls registry', function () {
    stubNavRegistry.register(function () {
      return {
        name: 'control',
        order: 100,
        template: `<span id="testTemplateEl"></span>`
      };
    });

    var $el = compile();
    expect($el.find('#testTemplateEl')).to.have.length(1);
  });

  it('injects templates from the ui/registry/chrome_config_controls registry', function () {
    stubConfigRegistry.register(function () {
      return {
        name: 'control',
        order: 100,
        navbar: {
          template: `<span id="testTemplateEl"></span>`
        }
      };
    });

    var $el = compile();
    expect($el.find('#testTemplateEl')).to.have.length(1);
  });

  it('renders controls in reverse order, assuming that each control will float:right', function () {
    stubConfigRegistry.register(function () {
      return {
        name: 'control2',
        order: 2,
        navbar: {
          template: `<span id="2", class="testControl"></span>`
        }
      };
    });
    stubNavRegistry.register(function () {
      return {
        name: 'control1',
        order: 1,
        template: `<span id="1", class="testControl"></span>`
      };
    });
    stubNavRegistry.register(function () {
      return {
        name: 'control3',
        order: 3,
        template: `<span id="3", class="testControl"></span>`
      };
    });

    var $el = compile();
    expect(
      $el.find('.testControl')
      .toArray()
      .map(el => el.id)
    ).to.eql(['3', '2', '1']);
  });
});

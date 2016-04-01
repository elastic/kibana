let ngMock = require('ngMock');
let $ = require('jquery');
let assign = require('lodash').assign;
let expect = require('expect.js');

describe('Config Directive', function () {

  let build = function () {};

  beforeEach(ngMock.module('kibana', function ($compileProvider) {
    let renderCount = 0;
    $compileProvider.directive('renderCounter', function () {
      return {
        link: function ($scope, $el) {
          $el.html(++renderCount);
        }
      };
    });
  }));

  beforeEach(ngMock.inject(function ($compile, $rootScope) {

    build = function (attrs, scopeVars) {
      let $el = $('<config>').attr(attrs);
      let $scope = $rootScope.$new();
      assign($scope, scopeVars || {});
      $compile($el)($scope);
      $scope.$digest();
      return $el;
    };

  }));

  it('renders it\'s config template', function () {
    let $config = build({ 'config-template': '"<uniqel></uniqel>"' });
    expect($config.find('uniqel').size()).to.be(1);
  });

  it('exposes an object a config object using it\'s name', function () {
    let $config = build(
      {
        'config-template': '"<uniqel>{{ controller.name }}</uniqel>"',
        'config-object': 'controller',
      },
      {
        controller: {
          name: 'foobar'
        }
      }
    );

    expect($config.find('uniqel').text()).to.be('foobar');
  });

  it('only renders the config-template once', function () {
    let $config = build({ 'config-template': '"<div render-counter></div>"' });
    expect($config.find('[render-counter]').text()).to.be('1');
  });
});

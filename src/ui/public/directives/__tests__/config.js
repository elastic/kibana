var ngMock = require('ngMock');
var $ = require('jquery');
var assign = require('lodash').assign;
var expect = require('expect.js');

describe('Config Directive', function () {

  var build = function () {};

  beforeEach(ngMock.module('kibana', function ($compileProvider) {
    var renderCount = 0;
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
      var $el = $('<config>').attr(attrs);
      var $scope = $rootScope.$new();
      assign($scope, scopeVars || {});
      $compile($el)($scope);
      $scope.$digest();
      return $el;
    };

  }));

  it('renders it\'s config template', function () {
    var $config = build({ 'config-template': '"<uniqel></uniqel>"' });
    expect($config.find('uniqel').size()).to.be(1);
  });

  it('exposes an object a config object using it\'s name', function () {
    var $config = build(
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
    var $config = build({ 'config-template': '"<div render-counter></div>"' });
    expect($config.find('[render-counter]').text()).to.be('1');
  });
});

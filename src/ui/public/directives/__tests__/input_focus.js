var angular = require('angular');
var $ = require('jquery');
var expect = require('expect.js');
var ngMock = require('ngMock');
require('ui/directives/input_focus');

describe('Input focus directive', function () {
  var $compile;
  var $rootScope;
  var $timeout;
  var element;
  var $el;
  var selectedEl;
  var selectedText;
  var inputValue = 'Input Text Value';

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_, _$timeout_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    $timeout = _$timeout_;

    $el = $('<div>');
    $el.appendTo('body');
  }));

  afterEach(function () {
    $el.remove();
    $el = null;
  });

  function renderEl(html) {
    $rootScope.value = inputValue;
    element = $compile(html)($rootScope);
    element.appendTo($el);
    $rootScope.$digest();
    $timeout.flush();
    selectedEl = document.activeElement;
    selectedText = selectedEl.value.slice(
      selectedEl.selectionStart,
      selectedEl.selectionEnd
    );
  }


  it('should focus the input', function () {
    renderEl('<input type="text" ng-model="value" input-focus />');
    expect(selectedEl).to.equal(element[0]);
    expect(selectedText.length).to.equal(0);
  });

  it('should select the text in the input', function () {
    renderEl('<input type="text" ng-model="value" input-focus="select" />');
    expect(selectedEl).to.equal(element[0]);
    expect(selectedText.length).to.equal(inputValue.length);
    expect(selectedText).to.equal(inputValue);
  });
});

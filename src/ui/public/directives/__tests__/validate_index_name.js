import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/directives/validate_index_name';

// Load the kibana app dependencies.

describe('Validate index name directive', function () {
  let $compile;
  let $rootScope;
  var html = '<input type="text" ng-model="indexName" validate-index-name />';

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  function checkPattern(input) {
    $rootScope.indexName = input;
    var element = $compile(html)($rootScope);
    $rootScope.$digest();
    return element;
  }

  var badPatterns = [
    null,
    undefined,
    '',
    '.',
    '..',
    'foo\\bar',
    'foo/bar',
    'foo?bar',
    'foo"bar',
    'foo<bar',
    'foo>bar',
    'foo|bar',
    'foo bar',
    'foo,bar',
  ];

  var goodPatterns = [
    '...',
    'foo',
    'foo.bar',
    'foo*',
    'foo.bar*',
    'foo.*',
    '[foo-]YYYY-MM-DD',
  ];

  badPatterns.forEach(function (pattern) {
    it('should not accept index pattern: ' + pattern, function () {
      var element = checkPattern(pattern);
      expect(element.hasClass('ng-invalid')).to.be(true);
      expect(element.hasClass('ng-valid')).to.not.be(true);
    });
  });

  goodPatterns.forEach(function (pattern) {
    it('should accept index pattern: ' + pattern, function () {
      var element = checkPattern(pattern);
      expect(element.hasClass('ng-invalid')).to.not.be(true);
      expect(element.hasClass('ng-valid')).to.be(true);
    });
  });
});

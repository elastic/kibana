import expect from 'expect.js';
import ngMock from 'ng_mock';
import '../validate_index_pattern';

// Load the kibana app dependencies.

describe('Validate index pattern directive', function () {
  let $compile;
  let $rootScope;
  const noWildcardHtml = '<input type="text" ng-model="indexName" validate-index-pattern />';
  const requiredHtml = '<input type="text" ng-model="indexName" validate-index-pattern required />';
  const allowWildcardHtml = '<input type="text" ng-model="indexName" validate-index-pattern validate-index-pattern-allow-wildcard />';

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  function checkPattern(input, html) {
    $rootScope.indexName = input;
    const element = $compile(html)($rootScope);
    $rootScope.$digest();
    return element;
  }

  const emptyPatterns = [
    undefined,
    null,
    ''
  ];

  const badPatterns = [
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
  ];

  const goodPatterns = [
    '...',
    'foo',
    'foo.bar',
    '[foo-]YYYY-MM-DD',
    'foo:bar',
    'foo,bar',
  ];

  const wildcardPatterns = [
    'foo*',
    'foo.bar*',
    'foo.*'
  ];

  badPatterns.forEach(function (pattern) {
    it('should not accept index pattern: ' + pattern, function () {
      const element = checkPattern(pattern, noWildcardHtml);
      expect(element.hasClass('ng-invalid')).to.be(true);
      expect(element.hasClass('ng-valid')).to.not.be(true);
    });
  });

  goodPatterns.forEach(function (pattern) {
    it('should accept index pattern: ' + pattern, function () {
      const element = checkPattern(pattern, noWildcardHtml);
      expect(element.hasClass('ng-invalid')).to.not.be(true);
      expect(element.hasClass('ng-valid')).to.be(true);
    });
  });

  emptyPatterns.forEach(function (pattern) {
    it('should not accept index pattern: ' + pattern, function () {
      const element = checkPattern(pattern, requiredHtml);
      expect(element.hasClass('ng-invalid')).to.be(true);
      expect(element.hasClass('ng-valid')).to.not.be(true);
    });
  });

  it('should disallow wildcards by default', function () {
    wildcardPatterns.forEach(function (pattern) {
      const element = checkPattern(pattern, noWildcardHtml);
      expect(element.hasClass('ng-invalid')).to.be(true);
      expect(element.hasClass('ng-valid')).to.not.be(true);
    });
  });

  it('should allow wildcards if the allow-wildcard attribute is present', function () {
    wildcardPatterns.forEach(function (pattern) {
      const element = checkPattern(pattern, allowWildcardHtml);
      expect(element.hasClass('ng-invalid')).to.not.be(true);
      expect(element.hasClass('ng-valid')).to.be(true);
    });
  });
});

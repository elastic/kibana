import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/directives/validate_index_name';

// Load the kibana app dependencies.

describe('Validate index name directive', function () {
  let $compile;
  let $rootScope;
  const noWildcardHtml = '<input type="text" ng-model="indexName" validate-index-name />';
  const allowWildcardHtml = '<input type="text" ng-model="indexName" allow-wildcard validate-index-name />';

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

  const badPatterns = [
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

  const goodPatterns = [
    '...',
    'foo',
    'foo.bar',
    '[foo-]YYYY-MM-DD',
    'foo:bar',
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

import angular from 'angular';
import _ from 'lodash';
import sinon from 'auto-release-sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import $ from 'jquery';
import 'ui/render_directive';
import 'plugins/kbn_doc_views/views/table';
import docViewsRegistry from 'ui/registry/doc_views';
import StubbedLogstashIndexPattern from 'fixtures/stubbed_logstash_index_pattern';
const hit = {
  '_index': 'logstash-2014.09.09',
  '_type': 'apache',
  '_id': '61',
  '_score': 1,
  '_source': {
    'extension': 'html',
    'bytes': 100,
    'area': [{lat: 7, lon: 7}],
    'noMapping': 'hasNoMapping',
    'objectArray': [{foo: true}, {bar: false}],
    '_underscore': 1
  }
};

// Load the kibana app dependencies.
let $parentScope;
let $scope;
let indexPattern;
let flattened;
let docViews;

const init = function ($elem, props) {
  ngMock.inject(function ($rootScope, $compile) {
    $parentScope = $rootScope;
    _.assign($parentScope, props);
    $compile($elem)($parentScope);
    $elem.scope().$digest();
    $scope = $elem.isolateScope();
  });
};

const destroy = function () {
  $scope.$destroy();
  $parentScope.$destroy();
};

describe('docViews', function () {
  let $elem;
  let initView;

  beforeEach(ngMock.module('kibana'));
  beforeEach(function () {
    const aggs = 'index-pattern="indexPattern" hit="hit" filter="filter"';
    $elem = angular.element(`<render-directive ${aggs} definition="view.directive"></render-directive>`);
    ngMock.inject(function (Private) {
      indexPattern = Private(StubbedLogstashIndexPattern);
      flattened = indexPattern.flattenHit(hit);
      docViews = Private(docViewsRegistry);
    });
    initView = function initView(view) {
      $elem.append(view.directive.template);
      init($elem, {
        indexPattern: indexPattern,
        hit: hit,
        view: view,
        filter: sinon.spy()
      });
    };
  });

  afterEach(function () {
    destroy();
  });

  describe('Table', function () {
    beforeEach(function () {
      initView(docViews.byName.Table);
    });
    it('should have a row for each field', function () {
      const rows = $elem.find('tr');
      expect($elem.find('tr').length).to.be(_.keys(flattened).length);
    });

    it('should have the field name in the first column', function () {
      _.each(_.keys(flattened), function (field) {
        expect($elem.find('td[title="' + field + '"]').length).to.be(1);
      });
    });

    it('should have the a value for each field', function () {
      _.each(_.keys(flattened), function (field) {
        const cellValue = $elem.find('td[title="' + field + '"]').siblings().find('.doc-viewer-value').text();

        // This sucks, but testing the filter chain is too hairy ATM
        expect(cellValue.length).to.be.greaterThan(0);
      });
    });


    describe('filtering', function () {
      it('should apply a filter when clicking filterable fields', function () {
        const cell = $elem.find('td[title="bytes"]').next();

        cell.find('.fa-search-plus').first().click();
        expect($scope.filter.calledOnce).to.be(true);
        cell.find('.fa-search-minus').first().click();
        expect($scope.filter.calledTwice).to.be(true);
        cell.find('.fa-asterisk').first().click();
        expect($scope.filter.calledThrice).to.be(true);
      });

      it('should NOT apply a filter when clicking non-filterable fields', function () {
        const cell = $elem.find('td[title="area"]').next();

        cell.find('.fa-search-plus').first().click();
        expect($scope.filter.calledOnce).to.be(false);
        cell.find('.fa-search-minus').first().click();
        expect($scope.filter.calledTwice).to.be(false);
        cell.find('.fa-asterisk').first().click();
        expect($scope.filter.calledOnce).to.be(true);
      });
    });

    describe('warnings', function () {
      it('displays a warning about field name starting with underscore', function () {
        const cells = $elem.find('td[title="_underscore"]').siblings();
        expect(cells.find('.doc-viewer-underscore').length).to.be(1);
        expect(cells.find('.doc-viewer-no-mapping').length).to.be(0);
        expect(cells.find('.doc-viewer-object-array').length).to.be(0);
      });

      it('displays a warning about missing mappings', function () {
        const cells = $elem.find('td[title="noMapping"]').siblings();
        expect(cells.find('.doc-viewer-underscore').length).to.be(0);
        expect(cells.find('.doc-viewer-no-mapping').length).to.be(1);
        expect(cells.find('.doc-viewer-object-array').length).to.be(0);
      });

      it('displays a warning about objects in arrays', function () {
        const cells = $elem.find('td[title="objectArray"]').siblings();
        expect(cells.find('.doc-viewer-underscore').length).to.be(0);
        expect(cells.find('.doc-viewer-no-mapping').length).to.be(0);
        expect(cells.find('.doc-viewer-object-array').length).to.be(1);
      });
    });

  });

  describe('JSON', function () {
    beforeEach(function () {
      initView(docViews.byName.JSON);
    });
    it('has pretty JSON', function () {
      expect($scope.hitJson).to.equal(angular.toJson(hit, true));
    });

    it('should have a global ACE object', function () {
      expect(window.ace).to.be.a(Object);
    });

    it('should have one ACE div', function () {
      expect($elem.find('div[id="json-ace"]').length).to.be(1);
    });

    it('should contain the same code as hitJson', function () {
      const editor = window.ace.edit($elem.find('div[id="json-ace"]')[0]);
      const code = editor.getSession().getValue();
      expect(code).to.equal($scope.hitJson);
    });
  });
});

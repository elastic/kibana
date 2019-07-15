/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import angular from 'angular';
import _ from 'lodash';
import sinon from 'sinon';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import 'ui/render_directive';
import '../views/table';
import { DocViewsRegistryProvider } from 'ui/registry/doc_views';
import StubbedLogstashIndexPattern from 'fixtures/stubbed_logstash_index_pattern';
const hit = {
  '_index': 'logstash-2014.09.09',
  '_type': 'apache',
  '_id': '61',
  '_score': 1,
  '_source': {
    'extension': 'html',
    'bytes': 100,
    'area': [{ lat: 7, lon: 7 }],
    'noMapping': 'hasNoMapping',
    'objectArray': [{ foo: true }, { bar: false }],
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
      docViews = Private(DocViewsRegistryProvider);
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
      expect($elem.find('tr').length).to.be(_.keys(flattened).length);
    });

    it('should have the field name in the first column', function () {
      _.each(_.keys(flattened), function (field) {
        expect($elem.find('[data-test-subj="tableDocViewRow-' + field + '"]').length).to.be(1);
      });
    });

    it('should have the a value for each field', function () {
      _.each(_.keys(flattened), function (field) {
        const cellValue = $elem
          .find('[data-test-subj="tableDocViewRow-' + field + '"]')
          .find('.kbnDocViewer__value').text();

        // This sucks, but testing the filter chain is too hairy ATM
        expect(cellValue.length).to.be.greaterThan(0);
      });
    });


    describe('filtering', function () {
      it('should apply a filter when clicking filterable fields', function () {
        const row = $elem.find('[data-test-subj="tableDocViewRow-bytes"]');

        row.find('.fa-search-plus').first().click();
        expect($scope.filter.calledOnce).to.be(true);
        row.find('.fa-search-minus').first().click();
        expect($scope.filter.calledTwice).to.be(true);
        row.find('.fa-asterisk').first().click();
        expect($scope.filter.calledThrice).to.be(true);
      });

      it('should NOT apply a filter when clicking non-filterable fields', function () {
        const row = $elem.find('[data-test-subj="tableDocViewRow-area"]');

        row.find('.fa-search-plus').first().click();
        expect($scope.filter.calledOnce).to.be(false);
        row.find('.fa-search-minus').first().click();
        expect($scope.filter.calledTwice).to.be(false);
        row.find('.fa-asterisk').first().click();
        expect($scope.filter.calledOnce).to.be(true);
      });
    });

    describe('warnings', function () {
      it('displays a warning about field name starting with underscore', function () {
        const row = $elem.find('[data-test-subj="tableDocViewRow-_underscore"]');
        expect(row.find('.kbnDocViewer__underscore').length).to.be(1);
        expect(row.find('.kbnDocViewer__noMapping').length).to.be(0);
        expect(row.find('.kbnDocViewer__objectArray').length).to.be(0);
      });

      it('displays a warning about missing mappings', function () {
        const row = $elem.find('[data-test-subj="tableDocViewRow-noMapping"]');
        expect(row.find('.kbnDocViewer__underscore').length).to.be(0);
        expect(row.find('.kbnDocViewer__noMapping').length).to.be(1);
        expect(row.find('.kbnDocViewer__objectArray').length).to.be(0);
      });

      it('displays a warning about objects in arrays', function () {
        const row = $elem.find('[data-test-subj="tableDocViewRow-objectArray"]');
        expect(row.find('.kbnDocViewer__underscore').length).to.be(0);
        expect(row.find('.kbnDocViewer__noMapping').length).to.be(0);
        expect(row.find('.kbnDocViewer__objectArray').length).to.be(1);
      });
    });
  });
});

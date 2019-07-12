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
    '@message': 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. \
      Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus \
      et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, \
      ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. \
      Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, \
      rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. \
      Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. \
      Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, \
      dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. \
      Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. \
      Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, \
      sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, \
      lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. \
      Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. \
      Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales, augue velit cursus nunc, quis gravida magna mi a libero. \
      Fusce vulputate eleifend sapien. Vestibulum purus quam, scelerisque ut, mollis sed, nonummy id, metus. \
      Nullam accumsan lorem in dui. Cras ultricies mi eu turpis hendrerit fringilla. Vestibulum ante ipsum primis \
      in faucibus orci luctus et ultrices posuere cubilia Curae; In ac dui quis mi consectetuer lacinia. \
      Nam pretium turpis et arcu. Duis arcu tortor, suscipit eget, imperdiet nec, imperdiet iaculis, ipsum. \
      Sed aliquam ultrices mauris. Integer ante arcu, accumsan a, consectetuer eget, posuere ut, mauris. Praesent adipiscing. \
      Phasellus ullamcorper ipsum rutrum nunc. Nunc nonummy metus. Vestibulum volutpat pretium libero. Cras id dui. Aenean ut',
    'extension': 'html',
    'bytes': 100,
    'area': [{ lat: 7, lon: 7 }],
    'noMapping': 'hasNoMapping',
    'objectArray': [{ foo: true }, { bar: false }],
    'relatedContent': `{
      "url": "http://www.laweekly.com/news/jonathan-gold-meets-nwa-2385365",
      "og:type": "article",
      "og:title": "Jonathan Gold meets N.W.A.",
      "og:description": "On May 5, 1989 the L.A. Weekly printed a cover story, \
      written by Jonathan Gold, about N.W.A., the most notorious band in the U.S., let alone in Los Ange...",
      "og:url": "http://www.laweekly.com/news/jonathan-gold-meets-nwa-2385365",
      "article:published_time": "2007-12-05T07:59:41-08:00",
      "article:modified_time": "2015-01-31T14:57:41-08:00",
      "article:section": "News",
      "og:image": "http://IMAGES1.laweekly.com/imager/jonathan-gold-meets-nwa/u/original/2415015/03covergold_1.jpg",
      "og:image:height": "637",
      "og:image:width": "480",
      "og:site_name": "LA Weekly",
      "twitter:title": "Jonathan Gold meets N.W.A.",
      "twitter:description": "On May 5, 1989 the L.A. Weekly printed a cover story, \
      written by Jonathan Gold, about N.W.A., the most notorious band in the U.S., let alone in Los Ange...",
      "twitter:card": "summary",
      "twitter:image": "http://IMAGES1.laweekly.com/imager/jonathan-gold-meets-nwa/u/original/2415015/03covergold_1.jpg",
      "twitter:site": "@laweekly"
    },
    {
      "url": "http://www.laweekly.com/news/once-more-in-the-river-2368108",
      "og:type": "article",
      "og:title": "Once more in the River",
      "og:description": "All photos by Mark Mauer. More after the jump...",
      "og:url": "http://www.laweekly.com/news/once-more-in-the-river-2368108",
      "article:published_time": "2007-10-15T10:46:29-07:00",
      "article:modified_time": "2014-10-28T15:00:05-07:00",
      "article:section": "News",
      "og:image": "http://IMAGES1.laweekly.com/imager/once-more-in-the-river/u/original/2430775/img_2536.jpg",
      "og:image:height": "640",
      "og:image:width": "480",
      "og:site_name": "LA Weekly",
      "twitter:title": "Once more in the River",
      "twitter:description": "All photos by Mark Mauer. More after the jump...",
      "twitter:card": "summary",
      "twitter:image": "http://IMAGES1.laweekly.com/imager/once-more-in-the-river/u/original/2430775/img_2536.jpg",
      "twitter:site": "@laweekly"
    }`,
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
        expect($elem.find('td[title="' + field + '"]').length).to.be(1);
      });
    });

    it('should have the a value for each field', function () {
      _.each(_.keys(flattened), function (field) {
        const cellValue = $elem.find('td[title="' + field + '"]').siblings().find('.kbnDocViewer__value').text();

        // This sucks, but testing the filter chain is too hairy ATM
        expect(cellValue.length).to.be.greaterThan(0);
      });
    });


    describe('filtering', function () {
      it('should apply a filter when clicking filterable fields', function () {
        const cell = $elem.find('td[title="bytes"]').prev();

        cell.find('.fa-search-plus').first().click();
        expect($scope.filter.calledOnce).to.be(true);
        cell.find('.fa-search-minus').first().click();
        expect($scope.filter.calledTwice).to.be(true);
        cell.find('.fa-asterisk').first().click();
        expect($scope.filter.calledThrice).to.be(true);
      });

      it('should NOT apply a filter when clicking non-filterable fields', function () {
        const cell = $elem.find('td[title="area"]').prev();

        cell.find('.fa-search-plus').first().click();
        expect($scope.filter.calledOnce).to.be(false);
        cell.find('.fa-search-minus').first().click();
        expect($scope.filter.calledTwice).to.be(false);
        cell.find('.fa-asterisk').first().click();
        expect($scope.filter.calledOnce).to.be(true);
      });
    });

    describe('collapse row', function () {
      it('should not collapse or expand other fields', function () {
        const collapseBtns = $elem.find('.discover-table-open-button');
        const first = collapseBtns.first()[0];
        const last = collapseBtns.last()[0];

        first.click();
        expect(first.parentElement.parentElement.lastElementChild.classList.contains('truncate-by-height'))
          .to.equal(false);
        expect(last.parentElement.parentElement.lastElementChild.classList.contains('truncate-by-height'))
          .to.equal(true);

        first.click();
        expect(first.parentElement.parentElement.lastElementChild.classList.contains('truncate-by-height'))
          .to.equal(true);
        expect(last.parentElement.parentElement.lastElementChild.classList.contains('truncate-by-height'))
          .to.equal(true);
      });

      it('should collapse an overflowed field details by default', function () {
        const collapseBtn = $elem.find('.discover-table-open-button').first()[0];
        expect(collapseBtn.parentElement.parentElement.lastElementChild
          .classList.contains('truncate-by-height')).to.equal(true);
      });

      it('should expand and collapse an overflowed field details', function () {
        const collapseBtn = $elem.find('.discover-table-open-button').first()[0];
        const spy = sinon.spy($scope, 'toggleViewer');

        collapseBtn.click();
        expect(spy.calledOnce).to.equal(true);
        collapseBtn.click();
        expect(spy.calledTwice).to.equal(true);
        spy.restore();

        collapseBtn.click();
        expect(collapseBtn.parentElement.parentElement.lastElementChild.classList.contains('truncate-by-height'))
          .to.equal(false);
        collapseBtn.click();
        expect(collapseBtn.parentElement.parentElement.lastElementChild.classList.contains('truncate-by-height'))
          .to.equal(true);
      });

      it('should have collapse button available in View single document mode', function () {
        $scope.filter = null;
        const collapseBtn = $elem.find('.discover-table-open-button').first()[0];
        expect(collapseBtn).not.to.equal(null);
      });
    });

    describe('warnings', function () {
      it('displays a warning about field name starting with underscore', function () {
        const cells = $elem.find('td[title="_underscore"]').siblings();
        expect(cells.find('.kbnDocViewer__underscore').length).to.be(1);
        expect(cells.find('.kbnDocViewer__noMapping').length).to.be(0);
        expect(cells.find('.kbnDocViewer__objectArray').length).to.be(0);
      });

      it('displays a warning about missing mappings', function () {
        const cells = $elem.find('td[title="noMapping"]').siblings();
        expect(cells.find('.kbnDocViewer__underscore').length).to.be(0);
        expect(cells.find('.kbnDocViewer__noMapping').length).to.be(1);
        expect(cells.find('.kbnDocViewer__objectArray').length).to.be(0);
      });

      it('displays a warning about objects in arrays', function () {
        const cells = $elem.find('td[title="objectArray"]').siblings();
        expect(cells.find('.kbnDocViewer__underscore').length).to.be(0);
        expect(cells.find('.kbnDocViewer__noMapping').length).to.be(0);
        expect(cells.find('.kbnDocViewer__objectArray').length).to.be(1);
      });
    });
  });
});

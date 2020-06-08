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
import { getFakeRow, getFakeRowVals } from 'fixtures/fake_row';
import $ from 'jquery';
import { pluginInstance } from './legacy';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { setScopedHistory } from '../../../../../../plugins/discover/public/kibana_services';
import { createBrowserHistory } from 'history';

describe('Doc Table', function () {
  let $parentScope;
  let $scope;

  // Stub out a minimal mapping of 4 fields
  let mapping;

  let fakeRowVals;
  let stubFieldFormatConverter;
  beforeEach(() => pluginInstance.initializeServices());
  beforeEach(() => pluginInstance.initializeInnerAngular());
  before(() => setScopedHistory(createBrowserHistory()));
  beforeEach(ngMock.module('app/discover'));
  beforeEach(
    ngMock.inject(function ($rootScope, Private) {
      $parentScope = $rootScope;
      $parentScope.indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      mapping = $parentScope.indexPattern.fields;

      // Stub `getConverterFor` for a field in the indexPattern to return mock data.
      // Returns `val` if provided, otherwise generates fake data for the field.
      fakeRowVals = getFakeRowVals('formatted', 0, mapping);
      stubFieldFormatConverter = function ($root, field, val) {
        const convertFn = (value, type, options) => {
          if (val) {
            return val;
          }
          const fieldName = _.get(options, 'field.name', null);

          return fakeRowVals[fieldName] || '';
        };

        $root.indexPattern.fields.getByName(field).format.convert = convertFn;
        $root.indexPattern.fields.getByName(field).format.getConverterFor = () => convertFn;
      };
    })
  );

  // Sets up the directive, take an element, and a list of properties to attach to the parent scope.
  const init = function ($elem, props) {
    ngMock.inject(function ($compile) {
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

  // For testing column removing/adding for the header and the rows
  const columnTests = function (elemType, parentElem) {
    it('should create a time column if the timefield is defined', function () {
      const childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(1);
    });

    it('should be able to add and remove columns', function () {
      let childElems;

      stubFieldFormatConverter($parentScope, 'bytes');
      stubFieldFormatConverter($parentScope, 'request_body');

      // Should include a column for toggling and the time column by default
      $parentScope.columns = ['bytes'];
      parentElem.scope().$digest();
      childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(2);
      expect($(childElems[1]).text()).to.contain('bytes');

      $parentScope.columns = ['bytes', 'request_body'];
      parentElem.scope().$digest();
      childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(3);
      expect($(childElems[2]).text()).to.contain('request_body');

      $parentScope.columns = ['request_body'];
      parentElem.scope().$digest();
      childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(2);
      expect($(childElems[1]).text()).to.contain('request_body');
    });

    it('should create only the toggle column if there is no timeField', function () {
      delete parentElem.scope().indexPattern.timeFieldName;
      parentElem.scope().$digest();

      const childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(0);
    });
  };

  describe('kbnTableRow', function () {
    const $elem = angular.element(
      '<tr kbn-table-row="row" ' +
        'columns="columns" ' +
        'sorting="sorting"' +
        'filter="filter"' +
        'index-pattern="indexPattern"' +
        '></tr>'
    );
    let row;

    beforeEach(function () {
      row = getFakeRow(0, mapping);

      init($elem, {
        row,
        columns: [],
        sorting: [],
        filter: sinon.spy(),
        maxLength: 50,
      });
    });
    afterEach(function () {
      destroy();
    });

    describe('adding and removing columns', function () {
      columnTests('[data-test-subj~="docTableField"]', $elem);
    });

    describe('details row', function () {
      it('should be an empty tr by default', function () {
        expect($elem.next().is('tr')).to.be(true);
        expect($elem.next().text()).to.be('');
      });

      it('should expand the detail row when the toggle arrow is clicked', function () {
        $elem.children(':first-child').click();
        $scope.$digest();
        expect($elem.next().text()).to.not.be('');
      });

      describe('expanded', function () {
        let $details;
        beforeEach(function () {
          // Open the row
          $scope.toggleRow();
          $scope.$digest();
          $details = $elem.next();
        });
        afterEach(function () {
          // Close the row
          $scope.toggleRow();
          $scope.$digest();
        });

        it('should be a tr with something in it', function () {
          expect($details.is('tr')).to.be(true);
          expect($details.text()).to.not.be.empty();
        });
      });
    });
  });

  describe('kbnTableRow meta', function () {
    const $elem = angular.element(
      '<tr kbn-table-row="row" ' +
        'columns="columns" ' +
        'sorting="sorting"' +
        'filtering="filtering"' +
        'index-pattern="indexPattern"' +
        '></tr>'
    );
    let row;

    beforeEach(function () {
      row = getFakeRow(0, mapping);

      init($elem, {
        row: row,
        columns: [],
        sorting: [],
        filtering: sinon.spy(),
        maxLength: 50,
      });

      // Open the row
      $scope.toggleRow();
      $scope.$digest();
      $elem.next();
    });

    afterEach(function () {
      destroy();
    });

    /** this no longer works with the new plugin approach
     it('should render even when the row source contains a field with the same name as a meta field', function () {
      setTimeout(() => {
        //this should be overridden by later changes
      }, 100);
      expect($details.find('tr').length).to.be(_.keys($parentScope.indexPattern.flattenHit($scope.row)).length);
    }); */
  });

  describe('row diffing', function () {
    let $row;
    let $scope;
    let $root;
    let $before;

    beforeEach(
      ngMock.inject(function ($rootScope, $compile, Private) {
        $root = $rootScope;
        $root.row = getFakeRow(0, mapping);
        $root.columns = ['_source'];
        $root.sorting = [];
        $root.filtering = sinon.spy();
        $root.maxLength = 50;
        $root.mapping = mapping;
        $root.indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

        // Stub field format converters for every field in the indexPattern
        $root.indexPattern.fields.forEach((f) => stubFieldFormatConverter($root, f.name));

        $row = $('<tr>').attr({
          'kbn-table-row': 'row',
          columns: 'columns',
          sorting: 'sorting',
          filtering: 'filtering',
          'index-pattern': 'indexPattern',
        });

        $scope = $root.$new();
        $compile($row)($scope);
        $root.$apply();

        $before = $row.find('td');
        expect($before).to.have.length(3);
        expect($before.eq(0).text().trim()).to.be('');
        expect($before.eq(1).text().trim()).to.match(/^time_formatted/);
      })
    );

    afterEach(function () {
      $row.remove();
    });

    it('handles a new column', function () {
      $root.columns.push('bytes');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(4);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
      expect($after[2]).to.be($before[2]);
      expect($after.eq(3).text().trim()).to.match(/^bytes_formatted/);
    });

    it('handles two new columns at once', function () {
      $root.columns.push('bytes');
      $root.columns.push('request_body');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(5);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
      expect($after[2]).to.be($before[2]);
      expect($after.eq(3).text().trim()).to.match(/^bytes_formatted/);
      expect($after.eq(4).text().trim()).to.match(/^request_body_formatted/);
    });

    it('handles three new columns in odd places', function () {
      $root.columns = ['@timestamp', 'bytes', '_source', 'request_body'];
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(6);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
      expect($after.eq(2).text().trim()).to.match(/^@timestamp_formatted/);
      expect($after.eq(3).text().trim()).to.match(/^bytes_formatted/);
      expect($after[4]).to.be($before[2]);
      expect($after.eq(5).text().trim()).to.match(/^request_body_formatted/);
    });

    it('handles a removed column', function () {
      _.pull($root.columns, '_source');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(2);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
    });

    it('handles two removed columns', function () {
      // first add a column
      $root.columns.push('@timestamp');
      $root.$apply();

      const $mid = $row.find('td');
      expect($mid).to.have.length(4);

      $root.columns.pop();
      $root.columns.pop();
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(2);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
    });

    it('handles three removed random columns', function () {
      // first add two column
      $root.columns.push('@timestamp', 'bytes');
      $root.$apply();

      const $mid = $row.find('td');
      expect($mid).to.have.length(5);

      $root.columns[0] = false; // _source
      $root.columns[2] = false; // bytes
      $root.columns = $root.columns.filter(Boolean);
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(3);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
      expect($after.eq(2).text().trim()).to.match(/^@timestamp_formatted/);
    });

    it('handles two columns with the same content', function () {
      stubFieldFormatConverter($root, 'request_body', fakeRowVals.bytes);

      $root.columns.length = 0;
      $root.columns.push('bytes');
      $root.columns.push('request_body');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(4);
      expect($after.eq(2).text().trim()).to.match(/^bytes_formatted/);
      expect($after.eq(3).text().trim()).to.match(/^bytes_formatted/);
    });

    it('handles two columns swapping position', function () {
      $root.columns.push('bytes');
      $root.$apply();

      const $mid = $row.find('td');
      expect($mid).to.have.length(4);

      $root.columns.reverse();
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(4);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
      expect($after[2]).to.be($mid[3]);
      expect($after[3]).to.be($mid[2]);
    });

    it('handles four columns all reversing position', function () {
      $root.columns.push('bytes', 'response', '@timestamp');
      $root.$apply();

      const $mid = $row.find('td');
      expect($mid).to.have.length(6);

      $root.columns.reverse();
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(6);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
      expect($after[2]).to.be($mid[5]);
      expect($after[3]).to.be($mid[4]);
      expect($after[4]).to.be($mid[3]);
      expect($after[5]).to.be($mid[2]);
    });

    it('handles multiple columns with the same name', function () {
      $root.columns.push('bytes', 'bytes', 'bytes');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(6);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
      expect($after[2]).to.be($before[2]);
      expect($after.eq(3).text().trim()).to.match(/^bytes_formatted/);
      expect($after.eq(4).text().trim()).to.match(/^bytes_formatted/);
      expect($after.eq(5).text().trim()).to.match(/^bytes_formatted/);
    });
  });
});

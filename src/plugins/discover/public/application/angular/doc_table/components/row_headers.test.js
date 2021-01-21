/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import angular from 'angular';
import 'angular-mocks';
import 'angular-sanitize';
import 'angular-route';
import _ from 'lodash';
import sinon from 'sinon';
import { getFakeRow } from 'fixtures/fake_row';
import $ from 'jquery';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { setScopedHistory, setServices, setDocViewsRegistry } from '../../../../kibana_services';
import { coreMock } from '../../../../../../../core/public/mocks';
import { dataPluginMock } from '../../../../../../data/public/mocks';
import { navigationPluginMock } from '../../../../../../navigation/public/mocks';
import { getInnerAngularModule } from '../../../../get_inner_angular';
import { createBrowserHistory } from 'history';

const fakeRowVals = {
  time: 'time_formatted',
  bytes: 'bytes_formatted',
  '@timestamp': '@timestamp_formatted',
  request_body: 'request_body_formatted',
};

describe('Doc Table', () => {
  const core = coreMock.createStart();
  const dataMock = dataPluginMock.createStartContract();
  let $parentScope;
  let $scope;
  let $elementScope;
  let timeout;
  let registry = [];

  // Stub out a minimal mapping of 4 fields
  let mapping;

  beforeAll(() => setScopedHistory(createBrowserHistory()));
  beforeEach(() => {
    angular.element.prototype.slice = jest.fn(function (index) {
      return $(this).slice(index);
    });
    angular.element.prototype.filter = jest.fn(function (condition) {
      return $(this).filter(condition);
    });
    angular.element.prototype.toggle = jest.fn(function (name) {
      return $(this).toggle(name);
    });
    angular.element.prototype.is = jest.fn(function (name) {
      return $(this).is(name);
    });
    setServices({
      uiSettings: core.uiSettings,
      filterManager: dataMock.query.filterManager,
    });

    setDocViewsRegistry({
      addDocView(view) {
        registry.push(view);
      },
      getDocViewsSorted() {
        return registry;
      },
      resetRegistry: () => {
        registry = [];
      },
    });

    getInnerAngularModule(
      'app/discover',
      core,
      {
        data: dataMock,
        navigation: navigationPluginMock.createStartContract(),
      },
      coreMock.createPluginInitializerContext()
    );
    angular.mock.module('app/discover');
  });
  beforeEach(
    angular.mock.inject(function ($rootScope, Private, $timeout) {
      $parentScope = $rootScope;
      timeout = $timeout;
      $parentScope.indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      mapping = $parentScope.indexPattern.fields;

      // Stub `getConverterFor` for a field in the indexPattern to return mock data.

      const convertFn = (value, type, options) => {
        const fieldName = _.get(options, 'field.name', null);
        return fakeRowVals[fieldName] || '';
      };
      $parentScope.indexPattern.getFormatterForField = () => ({
        convert: convertFn,
        getConverterFor: () => convertFn,
      });
    })
  );

  afterEach(() => {
    delete angular.element.prototype.slice;
    delete angular.element.prototype.filter;
    delete angular.element.prototype.toggle;
    delete angular.element.prototype.is;
  });

  // Sets up the directive, take an element, and a list of properties to attach to the parent scope.
  const init = function ($elem, props) {
    angular.mock.inject(function ($compile) {
      _.assign($parentScope, props);
      const el = $compile($elem)($parentScope);
      $elementScope = el.scope();
      el.scope().$digest();
      $scope = el.isolateScope();
    });
  };

  const destroy = () => {
    $scope.$destroy();
    $parentScope.$destroy();
  };

  // For testing column removing/adding for the header and the rows
  const columnTests = function (elemType, parentElem) {
    test('should create a time column if the timefield is defined', () => {
      const childElems = parentElem.find(elemType);
      expect(childElems.length).toBe(1);
    });

    test('should be able to add and remove columns', () => {
      let childElems;

      // Should include a column for toggling and the time column by default
      $parentScope.columns = ['bytes'];
      $elementScope.$digest();
      childElems = parentElem.find(elemType);
      expect(childElems.length).toBe(2);
      expect($(childElems[1]).text()).toContain('bytes');

      $parentScope.columns = ['bytes', 'request_body'];
      $elementScope.$digest();
      childElems = parentElem.find(elemType);
      expect(childElems.length).toBe(3);
      expect($(childElems[2]).text()).toContain('request_body');

      $parentScope.columns = ['request_body'];
      $elementScope.$digest();
      childElems = parentElem.find(elemType);
      expect(childElems.length).toBe(2);
      expect($(childElems[1]).text()).toContain('request_body');
    });

    test('should create only the toggle column if there is no timeField', () => {
      delete $scope.indexPattern.timeFieldName;
      $scope.$digest();
      timeout.flush();

      const childElems = parentElem.find(elemType);
      expect(childElems.length).toBe(0);
    });
  };

  describe('kbnTableRow', () => {
    const $elem = $(
      '<tr kbn-table-row="row" ' +
        'columns="columns" ' +
        'sorting="sorting"' +
        'filter="filter"' +
        'index-pattern="indexPattern"' +
        '></tr>'
    );
    let row;

    beforeEach(() => {
      row = getFakeRow(0, mapping);

      init($elem, {
        row,
        columns: [],
        sorting: [],
        filter: sinon.spy(),
        maxLength: 50,
      });
    });
    afterEach(() => {
      destroy();
    });

    describe('adding and removing columns', () => {
      columnTests('[data-test-subj~="docTableField"]', $elem);
    });

    describe('details row', () => {
      test('should be an empty tr by default', () => {
        expect($elem.next().is('tr')).toBe(true);
        expect($elem.next().text()).toBe('');
      });

      test('should expand the detail row when the toggle arrow is clicked', () => {
        $elem.children(':first-child').click();
        expect($elem.next().text()).not.toBe('');
      });

      describe('expanded', () => {
        let $details;
        beforeEach(() => {
          // Open the row
          $scope.toggleRow();
          timeout.flush();
          $details = $elem.next();
        });
        afterEach(() => {
          // Close the row
          $scope.toggleRow();
        });

        test('should be a tr with something in it', () => {
          expect($details.is('tr')).toBe(true);
          expect($details.text()).toBeTruthy();
        });
      });
    });
  });

  describe('kbnTableRow meta', () => {
    const $elem = angular.element(
      '<tr kbn-table-row="row" ' +
        'columns="columns" ' +
        'sorting="sorting"' +
        'filtering="filtering"' +
        'index-pattern="indexPattern"' +
        '></tr>'
    );
    let row;

    beforeEach(() => {
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
      timeout.flush();
      $elem.next();
    });

    afterEach(() => {
      destroy();
    });

    /** this no longer works with the new plugin approach
     test('should render even when the row source contains a field with the same name as a meta field', () => {
      setTimeout(() => {
        //this should be overridden by later changes
      }, 100);
      expect($details.find('tr').length).toBe(_.keys($parentScope.indexPattern.flattenHit($scope.row)).length);
    }); */
  });

  describe('row diffing', () => {
    let $row;
    let $scope;
    let $root;
    let $before;

    beforeEach(
      angular.mock.inject(function ($rootScope, $compile, Private) {
        $root = $rootScope;
        $root.row = getFakeRow(0, mapping);
        $root.columns = ['_source'];
        $root.sorting = [];
        $root.filtering = sinon.spy();
        $root.maxLength = 50;
        $root.mapping = mapping;
        $root.indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

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
        expect($before).toHaveLength(3);
        expect($before.eq(0).text().trim()).toBe('');
        expect($before.eq(1).text().trim()).toMatch(/^time_formatted/);
      })
    );

    afterEach(() => {
      $row.remove();
    });

    test('handles a new column', () => {
      $root.columns.push('bytes');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).toHaveLength(4);
      expect($after[0].outerHTML).toBe($before[0].outerHTML);
      expect($after[1].outerHTML).toBe($before[1].outerHTML);
      expect($after[2].outerHTML).toBe($before[2].outerHTML);
      expect($after.eq(3).text().trim()).toMatch(/^bytes_formatted/);
    });

    test('handles two new columns at once', () => {
      $root.columns.push('bytes');
      $root.columns.push('request_body');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).toHaveLength(5);
      expect($after[0].outerHTML).toBe($before[0].outerHTML);
      expect($after[1].outerHTML).toBe($before[1].outerHTML);
      expect($after[2].outerHTML).toBe($before[2].outerHTML);
      expect($after.eq(3).text().trim()).toMatch(/^bytes_formatted/);
      expect($after.eq(4).text().trim()).toMatch(/^request_body_formatted/);
    });

    test('handles three new columns in odd places', () => {
      $root.columns = ['@timestamp', 'bytes', '_source', 'request_body'];
      $root.$apply();

      const $after = $row.find('td');
      expect($after).toHaveLength(6);
      expect($after[0].outerHTML).toBe($before[0].outerHTML);
      expect($after[1].outerHTML).toBe($before[1].outerHTML);
      expect($after.eq(2).text().trim()).toMatch(/^@timestamp_formatted/);
      expect($after.eq(3).text().trim()).toMatch(/^bytes_formatted/);
      expect($after[4].outerHTML).toBe($before[2].outerHTML);
      expect($after.eq(5).text().trim()).toMatch(/^request_body_formatted/);
    });

    test('handles a removed column', () => {
      _.pull($root.columns, '_source');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).toHaveLength(2);
      expect($after[0].outerHTML).toBe($before[0].outerHTML);
      expect($after[1].outerHTML).toBe($before[1].outerHTML);
    });

    test('handles two removed columns', () => {
      // first add a column
      $root.columns.push('@timestamp');
      $root.$apply();

      const $mid = $row.find('td');
      expect($mid).toHaveLength(4);

      $root.columns.pop();
      $root.columns.pop();
      $root.$apply();

      const $after = $row.find('td');
      expect($after).toHaveLength(2);
      expect($after[0].outerHTML).toBe($before[0].outerHTML);
      expect($after[1].outerHTML).toBe($before[1].outerHTML);
    });

    test('handles three removed random columns', () => {
      // first add two column
      $root.columns.push('@timestamp', 'bytes');
      $root.$apply();

      const $mid = $row.find('td');
      expect($mid).toHaveLength(5);

      $root.columns[0] = false; // _source
      $root.columns[2] = false; // bytes
      $root.columns = $root.columns.filter(Boolean);
      $root.$apply();

      const $after = $row.find('td');
      expect($after).toHaveLength(3);
      expect($after[0].outerHTML).toBe($before[0].outerHTML);
      expect($after[1].outerHTML).toBe($before[1].outerHTML);
      expect($after.eq(2).text().trim()).toMatch(/^@timestamp_formatted/);
    });

    test('handles two columns with the same content', () => {
      const tempVal = fakeRowVals.request_body;
      fakeRowVals.request_body = 'bytes_formatted';

      $root.columns.length = 0;
      $root.columns.push('bytes');
      $root.columns.push('request_body');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).toHaveLength(4);
      expect($after.eq(2).text().trim()).toMatch(/^bytes_formatted/);
      expect($after.eq(3).text().trim()).toMatch(/^bytes_formatted/);
      fakeRowVals.request_body = tempVal;
    });

    test('handles two columns swapping position', () => {
      $root.columns.push('bytes');
      $root.$apply();

      const $mid = $row.find('td');
      expect($mid).toHaveLength(4);

      $root.columns.reverse();
      $root.$apply();

      const $after = $row.find('td');
      expect($after).toHaveLength(4);
      expect($after[0].outerHTML).toBe($before[0].outerHTML);
      expect($after[1].outerHTML).toBe($before[1].outerHTML);
      expect($after[2].outerHTML).toBe($mid[3].outerHTML);
      expect($after[3].outerHTML).toBe($mid[2].outerHTML);
    });

    test('handles four columns all reversing position', () => {
      $root.columns.push('bytes', 'response', '@timestamp');
      $root.$apply();

      const $mid = $row.find('td');
      expect($mid).toHaveLength(6);

      $root.columns.reverse();
      $root.$apply();

      const $after = $row.find('td');
      expect($after).toHaveLength(6);
      expect($after[0].outerHTML).toBe($before[0].outerHTML);
      expect($after[1].outerHTML).toBe($before[1].outerHTML);
      expect($after[2].outerHTML).toBe($mid[5].outerHTML);
      expect($after[3].outerHTML).toBe($mid[4].outerHTML);
      expect($after[4].outerHTML).toBe($mid[3].outerHTML);
      expect($after[5].outerHTML).toBe($mid[2].outerHTML);
    });

    test('handles multiple columns with the same name', () => {
      $root.columns.push('bytes', 'bytes', 'bytes');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).toHaveLength(6);
      expect($after[0].outerHTML).toBe($before[0].outerHTML);
      expect($after[1].outerHTML).toBe($before[1].outerHTML);
      expect($after[2].outerHTML).toBe($before[2].outerHTML);
      expect($after.eq(3).text().trim()).toMatch(/^bytes_formatted/);
      expect($after.eq(4).text().trim()).toMatch(/^bytes_formatted/);
      expect($after.eq(5).text().trim()).toMatch(/^bytes_formatted/);
    });
  });
});

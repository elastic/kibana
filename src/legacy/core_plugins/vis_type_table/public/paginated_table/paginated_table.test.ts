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
import 'angular-sanitize';
import 'angular-mocks';
import '../table_vis.mock';

import { getAngularModule } from '../get_inner_angular';
import { initTableVisLegacyModule } from '../shim/table_vis_legacy_module';
import { npStart } from '../legacy_imports';

describe('Table Vis - Paginated table', () => {
  let $el: any;
  let $rootScope;
  let $compile: any;
  let $scope: any;
  const defaultPerPage = 10;

  const initLocalAngular = () => {
    const tableVisModule = getAngularModule('kibana/table_vis', npStart.core);
    initTableVisLegacyModule(tableVisModule);
  };

  beforeEach(initLocalAngular);
  beforeEach(angular.mock.module('kibana/table_vis'));

  beforeEach(inject((_$rootScope_: any, _$compile_: any) => {
    $rootScope = _$rootScope_;
    $compile = _$compile_;
    $scope = $rootScope.$new();
  }));

  // @ts-ignore
  const makeData = function(colCount: any, rowCount: any) {
    let columns = [];
    let rows = [];

    if (_.isNumber(colCount)) {
      _.times(colCount, function(i) {
        columns.push({ id: i, title: 'column' + i, formatter: { convert: _.identity } });
      });
    } else {
      columns = colCount.map((col, i) => ({
        id: i,
        title: col.title,
        formatter: col.formatter || { convert: _.identity },
      }));
    }

    if (_.isNumber(rowCount)) {
      _.times(rowCount, function(row) {
        const rowItems = {};

        _.times(columns.length, function(col) {
          rowItems[col] = 'item' + col + row;
        });

        rows.push(rowItems);
      });
    } else {
      rows = rowCount.map(row => {
        const newRow = {};
        row.forEach((v, i) => (newRow[i] = v));
        return newRow;
      });
    }

    return {
      columns: columns,
      rows: rows,
    };
  };

  const renderTable = function(
    table: any,
    cols: any,
    rows: any,
    perPage: any,
    sort: any,
    linkToTop: any
  ) {
    $scope.table = table || { columns: [], rows: [] };
    $scope.cols = cols || [];
    $scope.rows = rows || [];
    $scope.perPage = perPage || defaultPerPage;
    $scope.sort = sort || {};
    $scope.linkToTop = linkToTop;

    const template = `
      <paginated-table
        table="table"
        columns="cols"
        rows="rows"
        per-page="perPage"
        sort="sort"
        link-to-top="linkToTop">`;
    $el = $compile(template)($scope);

    $scope.$digest();
  };

  describe('rendering', () => {
    it('should not display without rows', () => {
      const cols = [
        {
          title: 'test1',
        },
      ];
      const rows: any = [];

      renderTable(null, cols, rows, undefined, undefined, undefined);
      expect($el.children().length).toBe(0);
    });
  });
});

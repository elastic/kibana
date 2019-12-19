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

import { isNumber, times, identity, random } from 'lodash';
import angular, { IRootScopeService, IScope, ICompileService } from 'angular';
import $ from 'jquery';
import 'angular-sanitize';
import 'angular-mocks';
import '../table_vis.mock';

import { getAngularModule } from '../get_inner_angular';
import { initTableVisLegacyModule } from '../table_vis_legacy_module';
import { npStart } from '../legacy_imports';

interface Sort {
  columnIndex: number;
  direction: string;
}

interface Row {
  [key: string]: number | string;
}

interface Column {
  id?: string;
  title: string;
  formatter?: {
    convert?: (val: string) => string;
    [key: string]: any;
  };
  sortable?: boolean;
}

interface Table {
  columns: Column[];
  rows: Row[];
}

interface PaginatedTableScope extends IScope {
  table?: Table;
  cols?: Column[];
  rows?: Row[];
  perPage?: number;
  sort?: Sort;
  linkToTop?: boolean;
}

describe('Table Vis - Paginated table', () => {
  let $el: JQuery<Element>;
  let $rootScope: IRootScopeService;
  let $compile: ICompileService;
  let $scope: PaginatedTableScope;
  const defaultPerPage = 10;
  let paginatedTable: any;

  const initLocalAngular = () => {
    const tableVisModule = getAngularModule('kibana/table_vis', npStart.core);
    initTableVisLegacyModule(tableVisModule);
  };

  beforeEach(initLocalAngular);
  beforeEach(angular.mock.module('kibana/table_vis'));

  beforeEach(
    angular.mock.inject((_$rootScope_: IRootScopeService, _$compile_: ICompileService) => {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      $scope = $rootScope.$new();
    })
  );

  afterEach(() => {
    $scope.$destroy();
  });

  const makeData = (colCount: number | Column[], rowCount: number | string[][]) => {
    let columns: Column[] = [];
    let rows: Row[] = [];

    if (isNumber(colCount)) {
      times(colCount, i => {
        columns.push({
          id: `${i}`,
          title: `column${i}`,
          formatter: { convert: identity, getConverterFor: () => identity },
        });
      });
    } else {
      columns = colCount.map(
        (col, i) =>
          ({
            id: `${i}`,
            title: col.title,
            formatter: col.formatter || { convert: identity, getConverterFor: () => identity },
          } as Column)
      );
    }

    if (isNumber(rowCount)) {
      times(rowCount, row => {
        const rowItems: Row = {};

        times(columns.length, col => {
          rowItems[`${col}`] = `item-${col}-${row}`;
        });

        rows.push(rowItems);
      });
    } else {
      rows = rowCount.map((row: string[]) => {
        const newRow: Row = {};
        row.forEach((v, i) => (newRow[i] = v));
        return newRow;
      });
    }

    return {
      columns,
      rows,
    };
  };

  const renderTable = (
    table: { columns: Column[]; rows: Row[] } | null,
    cols: Column[],
    rows: Row[],
    perPage?: number,
    sort?: Sort,
    linkToTop?: boolean
  ) => {
    $scope.table = table || { columns: [], rows: [] };
    $scope.cols = cols || [];
    $scope.rows = rows || [];
    $scope.perPage = perPage || defaultPerPage;
    $scope.sort = sort;
    $scope.linkToTop = linkToTop;

    const template = `
      <paginated-table
        table="table"
        columns="cols"
        rows="rows"
        per-page="perPage"
        sort="sort"
        link-to-top="linkToTop">`;
    const element = $compile(template)($scope);
    $el = $(element);

    $scope.$digest();
    paginatedTable = element.controller('paginatedTable');
  };

  describe('rendering', () => {
    test('should not display without rows', () => {
      const cols: Column[] = [
        {
          id: 'col-1-1',
          title: 'test1',
        },
      ];
      const rows: Row[] = [];

      renderTable(null, cols, rows);
      expect($el.children().length).toBe(0);
    });

    test('should render columns and rows', () => {
      const data = makeData(2, 2);
      const cols = data.columns;
      const rows = data.rows;

      renderTable(data, cols, rows);
      expect($el.children().length).toBe(1);
      const tableRows = $el.find('tbody tr');

      // should contain the row data
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(0)
          .text()
      ).toBe(rows[0][0]);
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(1)
          .text()
      ).toBe(rows[0][1]);
      expect(
        tableRows
          .eq(1)
          .find('td')
          .eq(0)
          .text()
      ).toBe(rows[1][0]);
      expect(
        tableRows
          .eq(1)
          .find('td')
          .eq(1)
          .text()
      ).toBe(rows[1][1]);
    });

    test('should paginate rows', () => {
      // note: paginate truncates pages, so don't make too many
      const rowCount = random(16, 24);
      const perPageCount = random(5, 8);
      const data = makeData(3, rowCount);
      const pageCount = Math.ceil(rowCount / perPageCount);

      renderTable(data, data.columns, data.rows, perPageCount);
      const tableRows = $el.find('tbody tr');
      expect(tableRows.length).toBe(perPageCount);
      // add 2 for the first and last page links
      expect($el.find('paginate-controls button').length).toBe(pageCount + 2);
    });

    test('should not show blank rows on last page', () => {
      const rowCount = 7;
      const perPageCount = 10;
      const data = makeData(3, rowCount);

      renderTable(data, data.columns, data.rows, perPageCount);
      const tableRows = $el.find('tbody tr');
      expect(tableRows.length).toBe(rowCount);
    });

    test('should not show link to top when not set', () => {
      const data = makeData(5, 5);
      renderTable(data, data.columns, data.rows, 10);

      const linkToTop = $el.find('[data-test-subj="paginateControlsLinkToTop"]');
      expect(linkToTop.length).toBe(0);
    });

    test('should show link to top when set', () => {
      const data = makeData(5, 5);
      renderTable(data, data.columns, data.rows, 10, undefined, true);

      const linkToTop = $el.find('[data-test-subj="paginateControlsLinkToTop"]');
      expect(linkToTop.length).toBe(1);
    });
  });

  describe('sorting', () => {
    let data: Table;
    let lastRowIndex: number;

    beforeEach(() => {
      data = makeData(3, [
        ['bbbb', 'aaaa', 'zzzz'],
        ['cccc', 'cccc', 'aaaa'],
        ['zzzz', 'bbbb', 'bbbb'],
        ['aaaa', 'zzzz', 'cccc'],
      ]);

      lastRowIndex = data.rows.length - 1;
      renderTable(data, data.columns, data.rows);
    });

    test('should not sort by default', () => {
      const tableRows = $el.find('tbody tr');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(0)
          .text()
      ).toBe(data.rows[0][0]);
      expect(
        tableRows
          .eq(lastRowIndex)
          .find('td')
          .eq(0)
          .text()
      ).toBe(data.rows[lastRowIndex][0]);
    });

    test('should do nothing when sorting by invalid column id', () => {
      // sortColumn
      paginatedTable.sortColumn(999);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(0)
          .text()
      ).toBe('bbbb');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(1)
          .text()
      ).toBe('aaaa');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(2)
          .text()
      ).toBe('zzzz');
    });

    test('should do nothing when sorting by non sortable column', () => {
      data.columns[0].sortable = false;

      // sortColumn
      paginatedTable.sortColumn(0);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(0)
          .text()
      ).toBe('bbbb');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(1)
          .text()
      ).toBe('aaaa');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(2)
          .text()
      ).toBe('zzzz');
    });

    test("should set the sort direction to asc when it's not explicitly set", () => {
      paginatedTable.sortColumn(1);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(
        tableRows
          .eq(2)
          .find('td')
          .eq(1)
          .text()
      ).toBe('cccc');
      expect(
        tableRows
          .eq(1)
          .find('td')
          .eq(1)
          .text()
      ).toBe('bbbb');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(1)
          .text()
      ).toBe('aaaa');
    });

    test('should allow you to explicitly set the sort direction', () => {
      paginatedTable.sortColumn(1, 'desc');
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(1)
          .text()
      ).toBe('zzzz');
      expect(
        tableRows
          .eq(1)
          .find('td')
          .eq(1)
          .text()
      ).toBe('cccc');
      expect(
        tableRows
          .eq(2)
          .find('td')
          .eq(1)
          .text()
      ).toBe('bbbb');
    });

    test('should sort ascending on first invocation', () => {
      // sortColumn
      paginatedTable.sortColumn(0);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(0)
          .text()
      ).toBe('aaaa');
      expect(
        tableRows
          .eq(lastRowIndex)
          .find('td')
          .eq(0)
          .text()
      ).toBe('zzzz');
    });

    test('should sort descending on second invocation', () => {
      // sortColumn
      paginatedTable.sortColumn(0);
      paginatedTable.sortColumn(0);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(0)
          .text()
      ).toBe('zzzz');
      expect(
        tableRows
          .eq(lastRowIndex)
          .find('td')
          .eq(0)
          .text()
      ).toBe('aaaa');
    });

    test('should clear sorting on third invocation', () => {
      // sortColumn
      paginatedTable.sortColumn(0);
      paginatedTable.sortColumn(0);
      paginatedTable.sortColumn(0);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(0)
          .text()
      ).toBe(data.rows[0][0]);
      expect(
        tableRows
          .eq(lastRowIndex)
          .find('td')
          .eq(0)
          .text()
      ).toBe('aaaa');
    });

    test('should sort new column ascending', () => {
      // sort by first column
      paginatedTable.sortColumn(0);
      $scope.$digest();

      // sort by second column
      paginatedTable.sortColumn(1);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(1)
          .text()
      ).toBe('aaaa');
      expect(
        tableRows
          .eq(lastRowIndex)
          .find('td')
          .eq(1)
          .text()
      ).toBe('zzzz');
    });
  });

  describe('sorting duplicate columns', () => {
    let data;
    const colText = 'test row';

    beforeEach(() => {
      const cols: Column[] = [{ title: colText }, { title: colText }, { title: colText }];
      const rows = [
        ['bbbb', 'aaaa', 'zzzz'],
        ['cccc', 'cccc', 'aaaa'],
        ['zzzz', 'bbbb', 'bbbb'],
        ['aaaa', 'zzzz', 'cccc'],
      ];
      data = makeData(cols, rows);

      renderTable(data, data.columns, data.rows);
    });

    test('should have duplicate column titles', () => {
      const columns = $el.find('thead th span');
      columns.each((i, col) => {
        expect($(col).text()).toBe(colText);
      });
    });

    test('should handle sorting on columns with the same name', () => {
      // sort by the last column
      paginatedTable.sortColumn(2);
      $scope.$digest();

      const tableRows = $el.find('tbody tr');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(0)
          .text()
      ).toBe('cccc');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(1)
          .text()
      ).toBe('cccc');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(2)
          .text()
      ).toBe('aaaa');
      expect(
        tableRows
          .eq(1)
          .find('td')
          .eq(2)
          .text()
      ).toBe('bbbb');
      expect(
        tableRows
          .eq(2)
          .find('td')
          .eq(2)
          .text()
      ).toBe('cccc');
      expect(
        tableRows
          .eq(3)
          .find('td')
          .eq(2)
          .text()
      ).toBe('zzzz');
    });

    test('should sort correctly between columns', () => {
      // sort by the last column
      paginatedTable.sortColumn(2);
      $scope.$digest();

      let tableRows = $el.find('tbody tr');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(0)
          .text()
      ).toBe('cccc');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(1)
          .text()
      ).toBe('cccc');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(2)
          .text()
      ).toBe('aaaa');

      // sort by the first column
      paginatedTable.sortColumn(0);
      $scope.$digest();

      tableRows = $el.find('tbody tr');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(0)
          .text()
      ).toBe('aaaa');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(1)
          .text()
      ).toBe('zzzz');
      expect(
        tableRows
          .eq(0)
          .find('td')
          .eq(2)
          .text()
      ).toBe('cccc');

      expect(
        tableRows
          .eq(1)
          .find('td')
          .eq(0)
          .text()
      ).toBe('bbbb');
      expect(
        tableRows
          .eq(2)
          .find('td')
          .eq(0)
          .text()
      ).toBe('cccc');
      expect(
        tableRows
          .eq(3)
          .find('td')
          .eq(0)
          .text()
      ).toBe('zzzz');
    });

    test('should not sort duplicate columns', () => {
      paginatedTable.sortColumn(1);
      $scope.$digest();

      const sorters = $el.find('thead th i');
      expect(sorters.eq(0).hasClass('fa-sort')).toBe(true);
      expect(sorters.eq(1).hasClass('fa-sort')).toBe(false);
      expect(sorters.eq(2).hasClass('fa-sort')).toBe(true);
    });
  });

  describe('object rows', () => {
    let cols: Column[];
    let rows: any;

    beforeEach(() => {
      cols = [
        {
          title: 'object test',
          id: '0',
          formatter: {
            convert: val => {
              return val === 'zzz' ? '<h1>hello</h1>' : val;
            },
            getConverterFor: () => (val: any) => {
              return val === 'zzz' ? '<h1>hello</h1>' : val;
            },
          },
        },
      ];
      rows = [['aaaa'], ['zzz'], ['bbbb']];
      renderTable({ columns: cols, rows }, cols, rows);
    });

    test('should append object markup', () => {
      const tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('h1').length).toBe(0);
      expect(tableRows.eq(1).find('h1').length).toBe(1);
      expect(tableRows.eq(2).find('h1').length).toBe(0);
    });

    test('should sort using object value', () => {
      paginatedTable.sortColumn(0);
      $scope.$digest();
      let tableRows = $el.find('tbody tr');
      expect(tableRows.eq(0).find('h1').length).toBe(0);
      expect(tableRows.eq(1).find('h1').length).toBe(0);
      // html row should be the last row
      expect(tableRows.eq(2).find('h1').length).toBe(1);

      paginatedTable.sortColumn(0);
      $scope.$digest();
      tableRows = $el.find('tbody tr');
      // html row should be the first row
      expect(tableRows.eq(0).find('h1').length).toBe(1);
      expect(tableRows.eq(1).find('h1').length).toBe(0);
      expect(tableRows.eq(2).find('h1').length).toBe(0);
    });
  });
});

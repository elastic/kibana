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

import { Datatable } from 'src/plugins/expressions';
import { FieldFormat } from '../../common/field_formats';
import { datatableToCSV } from './export_csv';

function getDefaultOptions() {
  const formatFactory = jest.fn();
  formatFactory.mockReturnValue({ convert: (v: unknown) => `Formatted_${v}` } as FieldFormat);
  return {
    csvSeparator: ',',
    quoteValues: true,
    formatFactory,
  };
}

function getDataTable({ multipleColumns }: { multipleColumns?: boolean } = {}): Datatable {
  const layer1: Datatable = {
    type: 'datatable',
    columns: [{ id: 'col1', name: 'columnOne', meta: { type: 'string' } }],
    rows: [{ col1: 'value' }],
  };
  if (multipleColumns) {
    layer1.columns.push({ id: 'col2', name: 'columnTwo', meta: { type: 'number' } });
    layer1.rows[0].col2 = 5;
  }
  return layer1;
}

describe('CSV exporter', () => {
  test('should not break with empty data', () => {
    expect(
      datatableToCSV({ type: 'datatable', columns: [], rows: [] }, getDefaultOptions())
    ).toMatch('');
  });

  test('should export formatted values by default', () => {
    expect(datatableToCSV(getDataTable(), getDefaultOptions())).toMatch(
      'columnOne\r\n"Formatted_value"\r\n'
    );
  });

  test('should not quote values when requested', () => {
    return expect(
      datatableToCSV(getDataTable(), { ...getDefaultOptions(), quoteValues: false })
    ).toMatch('columnOne\r\nFormatted_value\r\n');
  });

  test('should use raw values when requested', () => {
    expect(datatableToCSV(getDataTable(), { ...getDefaultOptions(), raw: true })).toMatch(
      'columnOne\r\nvalue\r\n'
    );
  });

  test('should use separator for multiple columns', () => {
    expect(datatableToCSV(getDataTable({ multipleColumns: true }), getDefaultOptions())).toMatch(
      'columnOne,columnTwo\r\n"Formatted_value","Formatted_5"\r\n'
    );
  });

  test('should escape values', () => {
    const datatable = getDataTable();
    datatable.rows[0].col1 = '"value"';
    expect(datatableToCSV(datatable, getDefaultOptions())).toMatch(
      'columnOne\r\n"Formatted_""value"""\r\n'
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '@kbn/expressions-plugin';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { datatableToCSV } from './export_csv';

function getDefaultOptions() {
  const formatFactory = jest.fn();
  formatFactory.mockReturnValue({ convert: (v: unknown) => `Formatted_${v}` } as FieldFormat);
  return {
    csvSeparator: ',',
    quoteValues: true,
    formatFactory,
    escapeFormulaValues: false,
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

  test('should escape formulas', () => {
    const datatable = getDataTable();
    datatable.rows[0].col1 = '=1';
    expect(
      datatableToCSV(datatable, {
        ...getDefaultOptions(),
        escapeFormulaValues: true,
        formatFactory: () => ({ convert: (v: unknown) => v } as FieldFormat),
      })
    ).toMatch('columnOne\r\n"\'=1"\r\n');
  });
});

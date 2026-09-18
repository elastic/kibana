/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { MISSING_TOKEN } from '@kbn/field-formats-common';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { datatableToCSV } from './export_csv';

function getDefaultOptions() {
  const formatFactory = jest.fn();
  formatFactory.mockReturnValue({ convertToText: (v: unknown) => `Formatted_${v}` } as FieldFormat);
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
        formatFactory: () => ({ convertToText: (v: unknown) => v } as FieldFormat),
      })
    ).toMatch('columnOne\r\n"\'=1"\r\n');
  });

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['a missing bucket', MISSING_TOKEN],
  ])('should export %s as the dash the table renders', (_name, value) => {
    const datatable = getDataTable();
    datatable.rows[0].col1 = value;

    expect(datatableToCSV(datatable, getDefaultOptions())).toMatch('columnOne\r\n"-"\r\n');
  });

  test('should not let the formula guard turn the dash into an escaped value', () => {
    const datatable = getDataTable();
    datatable.rows[0].col1 = null;

    // "-" starts a formula, but the dash is our own constant rather than document content.
    expect(
      datatableToCSV(datatable, { ...getDefaultOptions(), escapeFormulaValues: true })
    ).toMatch('columnOne\r\n"-"\r\n');
  });

  test('should leave the dash unquoted when quoteValues is false', () => {
    const datatable = getDataTable();
    datatable.rows[0].col1 = null;

    expect(
      datatableToCSV(datatable, { ...getDefaultOptions(), quoteValues: false })
    ).toMatch('columnOne\r\n-\r\n');
  });

  test('should keep raw exports untouched for missing values', () => {
    const datatable = getDataTable();
    datatable.rows[0].col1 = null;

    expect(datatableToCSV(datatable, { ...getDefaultOptions(), raw: true })).toMatch(
      'columnOne\r\n\r\n'
    );
  });

  test('should escape text with csvSeparator char in it', () => {
    const datatable = getDataTable();
    datatable.rows[0].col1 = 'a,b';
    expect(
      datatableToCSV(datatable, {
        ...getDefaultOptions(),
        escapeFormulaValues: true,
        formatFactory: () => ({ convertToText: (v: unknown) => v } as FieldFormat),
      })
    ).toMatch('columnOne\r\n"a,b"\r\n');
  });

  test('should quote the dash when csvSeparator is -', () => {
    const datatable = getDataTable({ multipleColumns: true });
    datatable.rows[0].col1 = null;

    expect(datatableToCSV(datatable, { ...getDefaultOptions(), csvSeparator: '-' })).toBe(
      'columnOne-columnTwo\r\n"-"-"Formatted_5"\r\n'
    );
  });
});

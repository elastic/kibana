/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import { getColorCategories } from './color_categories';

const getNextExtension = (() => {
  let i = 0;
  const extensions = ['gz', 'css', '', 'rpm', 'deb', 'zip', null];
  return () => extensions[i++ % extensions.length];
})();

const basicDatatable = {
  columns: ['count', 'extension'].map((id) => ({ id } as DatatableColumn)),
  rows: Array.from({ length: 10 }).map((_, i) => ({
    count: i,
    extension: getNextExtension(),
  })) as DatatableRow[],
};

describe('getColorCategories', () => {
  it('should return no categories when accessor is undefined', () => {
    expect(getColorCategories(basicDatatable.rows)).toEqual([]);
  });

  it('should return no categories when accessor is not found', () => {
    expect(getColorCategories(basicDatatable.rows, 'N/A')).toEqual([]);
  });

  it('should return no categories when no rows are defined', () => {
    expect(getColorCategories(undefined, 'extension')).toEqual([]);
  });

  it('should return all categories from non-transpose datatable', () => {
    expect(getColorCategories(basicDatatable.rows, 'extension')).toEqual([
      'gz',
      'css',
      '',
      'rpm',
      'deb',
      'zip',
      'null',
    ]);
  });

  it('should exclude selected categories from non-transpose datatable', () => {
    expect(getColorCategories(basicDatatable.rows, 'extension', ['', null])).toEqual([
      'gz',
      'css',
      'rpm',
      'deb',
      'zip',
    ]);
  });
});

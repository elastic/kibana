/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DatatableRow } from '@kbn/expressions-plugin/common';
import { getColorCategories } from './color_categories';

const extensions = ['gz', 'css', '', 'rpm', 'deb', 'zip', null];
const getExtension = (i: number) => extensions[i % extensions.length];

const basicDatatableRows: DatatableRow[] = Array.from({ length: 30 }).map((_, i) => ({
  count: i,
  extension: getExtension(i),
}));

const isTransposedDatatableRows: DatatableRow[] = Array.from({ length: 30 }).map((_, i) => ({
  count: i,
  ['safari---extension']: getExtension(i),
  ['chrome---extension']: getExtension(i + 1),
  ['firefox---extension']: getExtension(i + 2),
}));

describe('getColorCategories', () => {
  it('should return all categories from datatable rows', () => {
    expect(getColorCategories(basicDatatableRows, 'extension')).toEqual([
      'gz',
      'css',
      '',
      'rpm',
      'deb',
      'zip',
      'null',
    ]);
  });

  it('should exclude selected categories from datatable rows', () => {
    expect(getColorCategories(basicDatatableRows, 'extension', false, ['', null])).toEqual([
      'gz',
      'css',
      'rpm',
      'deb',
      'zip',
    ]);
  });

  it('should return categories across all transpose columns of datatable rows', () => {
    expect(getColorCategories(isTransposedDatatableRows, 'extension', true)).toEqual([
      'gz',
      'css',
      '',
      'rpm',
      'deb',
      'zip',
      'null',
    ]);
  });

  it('should exclude selected categories across all transpose columns of datatable rows', () => {
    expect(getColorCategories(isTransposedDatatableRows, 'extension', true, ['', null])).toEqual([
      'gz',
      'css',
      'rpm',
      'deb',
      'zip',
    ]);
  });
});

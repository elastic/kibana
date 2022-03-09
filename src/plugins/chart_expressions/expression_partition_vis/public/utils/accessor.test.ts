/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { createMockVisData } from '../mocks';
import { getColumnByAccessor } from './accessor';

const visData = createMockVisData();

describe('getColumnByAccessor', () => {
  it('returns column by the index', () => {
    const index = 1;
    const column = getColumnByAccessor(index, visData.columns);
    expect(column).toEqual(visData.columns[index]);
  });

  it('returns undefiend if the index is higher then amount of columns', () => {
    const index = visData.columns.length;
    const column = getColumnByAccessor(index, visData.columns);
    expect(column).toBeUndefined();
  });

  it('returns column by id', () => {
    const column = visData.columns[1];
    const accessor: ExpressionValueVisDimension['accessor'] = {
      id: column.id,
      name: '',
      meta: { type: column.meta.type },
    };

    const foundColumn = getColumnByAccessor(accessor, visData.columns);
    expect(foundColumn).toEqual(column);
  });

  it('returns undefined for the accessor to non-existent column', () => {
    const accessor: ExpressionValueVisDimension['accessor'] = {
      id: 'non-existent-column',
      name: '',
      meta: { type: 'number' },
    };

    const column = getColumnByAccessor(accessor, visData.columns);
    expect(column).toBeUndefined();
  });
});

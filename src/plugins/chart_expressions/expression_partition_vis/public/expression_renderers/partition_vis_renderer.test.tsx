/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMockPieParams, createMockVisData } from '../mocks';
import { CellValueAction } from '../types';
import { getColumnCellValueActions } from './partition_vis_renderer';

const visParams = createMockPieParams();
const visData = createMockVisData();

const cellValueAction: CellValueAction = {
  displayName: 'Test',
  id: 'test',
  iconType: 'test-icon',
  execute: () => {},
};

describe('getColumnCellValueActions', () => {
  it('should get column cellValue actions for each params bucket', async () => {
    const result = await getColumnCellValueActions(visParams, visData, async () => [
      cellValueAction,
    ]);
    expect(result).toHaveLength(visParams.dimensions.buckets?.length ?? 0);
  });

  it('should contain the cellValue actions', async () => {
    const result = await getColumnCellValueActions(visParams, visData, async () => [
      cellValueAction,
      cellValueAction,
    ]);
    expect(result[0]).toEqual([cellValueAction, cellValueAction]);
  });

  it('should return empty array if no buckets', async () => {
    const result = await getColumnCellValueActions(
      { ...visParams, dimensions: { ...visParams.dimensions, buckets: undefined } },
      visData,
      async () => [cellValueAction]
    );
    expect(result).toEqual([]);
  });

  it('should return empty array if getCompatibleCellValueActions not passed', async () => {
    const result = await getColumnCellValueActions(visParams, visData, undefined);
    expect(result).toEqual([]);
  });
});

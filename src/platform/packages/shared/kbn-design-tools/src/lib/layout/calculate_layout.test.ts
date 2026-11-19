/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { calculateColumnLayout, calculateRowLayout } from './calculate_layout';
import { makeLayoutConfig } from '../tests/helpers';

describe('calculateColumnLayout', () => {
  it('should calculate stretch columns', () => {
    const config = makeLayoutConfig({
      alignType: 'stretch',
      count: 4,
      gutterSize: 8,
      marginSize: 16,
    });
    const { columnWidth, offsetLeft } = calculateColumnLayout(config, 1000);

    // available = 1000 - 2*16 = 968, totalGutter = 8*3 = 24, columnWidth = (968-24)/4 = 236
    expect(offsetLeft).toBe(16);
    expect(columnWidth).toBe(236);
  });

  it('should calculate center-aligned columns', () => {
    const config = makeLayoutConfig({ alignType: 'center', count: 3, width: 100, gutterSize: 10 });
    const { columnWidth, offsetLeft } = calculateColumnLayout(config, 800);

    // totalWidth = 3*100 + 2*10 = 320, offsetLeft = (800-320)/2 = 240
    expect(columnWidth).toBe(100);
    expect(offsetLeft).toBe(240);
  });

  it('should calculate left-aligned columns', () => {
    const config = makeLayoutConfig({
      alignType: 'left',
      count: 2,
      width: 120,
      gutterSize: 20,
      marginSize: 30,
    });
    const { columnWidth, offsetLeft } = calculateColumnLayout(config, 600);

    expect(columnWidth).toBe(120);
    expect(offsetLeft).toBe(30);
  });

  it('should calculate right-aligned columns', () => {
    const config = makeLayoutConfig({
      alignType: 'right',
      count: 2,
      width: 100,
      gutterSize: 10,
      marginSize: 20,
    });
    const { columnWidth, offsetLeft } = calculateColumnLayout(config, 500);

    // totalWidth = 2*100 + 1*10 = 210, offsetLeft = 500 - 210 - 20 = 270
    expect(columnWidth).toBe(100);
    expect(offsetLeft).toBe(270);
  });

  it('should default width to 100 when width is 0', () => {
    const config = makeLayoutConfig({ alignType: 'center', count: 2, width: 0, gutterSize: 0 });
    const { columnWidth } = calculateColumnLayout(config, 400);

    expect(columnWidth).toBe(100);
  });

  it('should clamp count to at least 1', () => {
    const config = makeLayoutConfig({
      alignType: 'stretch',
      count: 0,
      gutterSize: 8,
      marginSize: 16,
    });
    const { columnWidth } = calculateColumnLayout(config, 1000);

    // count clamped to 1: available = 968, gutter = 0, width = 968
    expect(columnWidth).toBe(968);
  });

  it('should clamp column width to 0 when margins exceed viewport', () => {
    const config = makeLayoutConfig({
      alignType: 'stretch',
      count: 4,
      gutterSize: 8,
      marginSize: 600,
    });
    const { columnWidth } = calculateColumnLayout(config, 1000);

    // available = max(0, 1000 - 1200) = 0, width = max(0, (0 - 24)/4) = 0
    expect(columnWidth).toBe(0);
  });
});

describe('calculateRowLayout', () => {
  it('should calculate stretch rows', () => {
    const config = makeLayoutConfig({
      rowAlignType: 'stretch',
      count: 3,
      gutterSize: 10,
      marginSize: 20,
    });
    const { rowHeight, offsetTop } = calculateRowLayout(config, 800);

    // available = 800 - 2*20 = 760, totalGutter = 10*2 = 20, rowHeight = (760-20)/3 = 246.67
    expect(offsetTop).toBe(20);
    expect(rowHeight).toBeCloseTo(246.67, 1);
  });

  it('should calculate center-aligned rows', () => {
    const config = makeLayoutConfig({
      rowAlignType: 'center',
      count: 2,
      height: 80,
      gutterSize: 10,
    });
    const { rowHeight, offsetTop } = calculateRowLayout(config, 600);

    // totalHeight = 2*80 + 1*10 = 170, offsetTop = (600-170)/2 = 215
    expect(rowHeight).toBe(80);
    expect(offsetTop).toBe(215);
  });

  it('should calculate top-aligned rows', () => {
    const config = makeLayoutConfig({
      rowAlignType: 'top',
      count: 2,
      height: 100,
      gutterSize: 10,
      marginSize: 15,
    });
    const { rowHeight, offsetTop } = calculateRowLayout(config, 500);

    expect(rowHeight).toBe(100);
    expect(offsetTop).toBe(15);
  });

  it('should calculate bottom-aligned rows', () => {
    const config = makeLayoutConfig({
      rowAlignType: 'bottom',
      count: 2,
      height: 100,
      gutterSize: 10,
      marginSize: 20,
    });
    const { rowHeight, offsetTop } = calculateRowLayout(config, 500);

    // totalHeight = 2*100 + 1*10 = 210, offsetTop = 500 - 210 - 20 = 270
    expect(rowHeight).toBe(100);
    expect(offsetTop).toBe(270);
  });

  it('should default height to 100 when height is 0', () => {
    const config = makeLayoutConfig({ rowAlignType: 'center', count: 2, height: 0, gutterSize: 0 });
    const { rowHeight } = calculateRowLayout(config, 400);

    expect(rowHeight).toBe(100);
  });

  it('should clamp count to at least 1', () => {
    const config = makeLayoutConfig({
      rowAlignType: 'stretch',
      count: 0,
      gutterSize: 10,
      marginSize: 20,
    });
    const { rowHeight } = calculateRowLayout(config, 800);

    // count clamped to 1: available = 760, gutter = 0, height = 760
    expect(rowHeight).toBe(760);
  });

  it('should clamp row height to 0 when margins exceed viewport', () => {
    const config = makeLayoutConfig({
      rowAlignType: 'stretch',
      count: 3,
      gutterSize: 10,
      marginSize: 500,
    });
    const { rowHeight } = calculateRowLayout(config, 800);

    // available = max(0, 800 - 1000) = 0, height = max(0, (0 - 20)/3) = 0
    expect(rowHeight).toBe(0);
  });
});

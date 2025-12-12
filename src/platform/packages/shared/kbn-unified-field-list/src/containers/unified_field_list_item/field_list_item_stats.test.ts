/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stubDataView, stubLogstashDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { getFieldForStats } from './field_list_item_stats';

describe('getFieldForStats', () => {
  it('should return the field itself if no multiFields are provided', () => {
    const fieldExtensionText = stubDataView.getFieldByName('machine.os')!;
    expect(fieldExtensionText.aggregatable).toBe(false);
    const resultText = getFieldForStats(fieldExtensionText, undefined);
    expect(resultText).toBe(fieldExtensionText);

    const fieldExtensionKeyword = stubDataView.getFieldByName('machine.os.raw')!;
    expect(fieldExtensionKeyword.aggregatable).toBe(true);
    const resultKeyword = getFieldForStats(fieldExtensionKeyword, undefined);
    expect(resultKeyword).toBe(fieldExtensionKeyword);
  });

  it('should return an aggregatable field itself even when multiFields are provided', () => {
    const fieldExtensionText = stubDataView.getFieldByName('machine.os')!;
    const fieldExtensionKeyword = stubDataView.getFieldByName('machine.os.raw')!;
    const fieldExtensionKeyword2 = stubDataView.getFieldByName('bytes')!;
    expect(fieldExtensionText.aggregatable).toBe(false);
    expect(fieldExtensionKeyword.aggregatable).toBe(true);
    expect(fieldExtensionKeyword2.aggregatable).toBe(true);
    const resultKeyword = getFieldForStats(fieldExtensionKeyword, [
      { field: fieldExtensionKeyword2, isSelected: false },
      { field: fieldExtensionText, isSelected: false },
    ]);
    expect(resultKeyword).toBe(fieldExtensionKeyword);
  });

  it('should return an aggregatable field when multiFields are provided', () => {
    const fieldExtensionText = stubDataView.getFieldByName('machine.os')!;
    const fieldExtensionKeyword = stubDataView.getFieldByName('machine.os.raw')!;
    expect(fieldExtensionText.aggregatable).toBe(false);
    expect(fieldExtensionKeyword.aggregatable).toBe(true);
    const resultKeyword = getFieldForStats(fieldExtensionText, [
      { field: fieldExtensionKeyword, isSelected: false },
    ]);
    expect(resultKeyword).toBe(fieldExtensionKeyword);
  });

  it('should return the field itself when no aggregatable multiFields are provided', () => {
    const fieldExtensionText = stubDataView.getFieldByName('machine.os')!;
    const fieldExtensionText2 = stubLogstashDataView.getFieldByName('hashed')!;
    expect(fieldExtensionText.aggregatable).toBe(false);
    expect(fieldExtensionText2.aggregatable).toBe(false);
    const resultFallback = getFieldForStats(fieldExtensionText, [
      { field: fieldExtensionText2, isSelected: false },
    ]);
    expect(resultFallback).toBe(fieldExtensionText);
  });
});

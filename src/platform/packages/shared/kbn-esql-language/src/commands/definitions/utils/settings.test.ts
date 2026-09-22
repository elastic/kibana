/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synth } from '@elastic/esql';
import { UnmappedFieldsStrategy } from '../../registry/types';
import { getSettingsCompletionItems, getUnmappedFieldsStrategy } from './settings';
import { EsqlSettingNames } from '../generated/settings';

describe('getSettingsCompletionItems', () => {
  it('returns non-serverless-only, non-ignored settings in non-serverless mode', () => {
    const items = getSettingsCompletionItems(false);
    const names = items.map((i) => i.label);
    expect(names).toContain(EsqlSettingNames.APPROXIMATION);
    expect(names).toContain(EsqlSettingNames.UNMAPPED_FIELDS);
    expect(names).not.toContain(EsqlSettingNames.PROJECT_ROUTING);
    expect(names).not.toContain(EsqlSettingNames.TIME_ZONE);
  });

  it('returns all non-ignored settings including serverless-only ones in serverless mode', () => {
    const items = getSettingsCompletionItems(true);
    const names = items.map((i) => i.label);
    expect(names).toContain(EsqlSettingNames.APPROXIMATION);
    expect(names).toContain(EsqlSettingNames.UNMAPPED_FIELDS);
    expect(names).toContain(EsqlSettingNames.PROJECT_ROUTING);
    expect(names).not.toContain(EsqlSettingNames.TIME_ZONE);
  });

  it('behaves the same as non-serverless when isServerless is undefined', () => {
    const items = getSettingsCompletionItems(undefined);
    const names = items.map((i) => i.label);
    expect(names).not.toContain(EsqlSettingNames.PROJECT_ROUTING);
    expect(names).not.toContain(EsqlSettingNames.TIME_ZONE);
  });

  it('formats each item with a trailing " = " in the text', () => {
    const items = getSettingsCompletionItems(false);
    for (const item of items) {
      expect(item.text).toBe(`${item.label} = `);
    }
  });
});

describe('getUnmappedFieldsStrategy', () => {
  it('should return DEFAULT strategy if no headers are provided', () => {
    const strategy = getUnmappedFieldsStrategy();
    expect(strategy).toBe(UnmappedFieldsStrategy.DEFAULT);
  });

  it('should return DEFAULT strategy if unmapped_fields setting is not provided', () => {
    const headers = [synth.header`SET timezone = "GMT+1"`];
    const strategy = getUnmappedFieldsStrategy(headers);
    expect(strategy).toBe(UnmappedFieldsStrategy.DEFAULT);
  });

  it('should return DEFAULT strategy if unmapped_fields setting is not valid', () => {
    const headers = [synth.header`SET unmapped_fields = "wrong_value"`];
    const strategy = getUnmappedFieldsStrategy(headers);
    expect(strategy).toBe(UnmappedFieldsStrategy.DEFAULT);
  });

  it('should return the DEFAULT strategy based on the unmapped_fields setting', () => {
    const headers = [synth.header`SET unmapped_fields = "DEFAULT"`];
    const strategy = getUnmappedFieldsStrategy(headers);
    expect(strategy).toBe(UnmappedFieldsStrategy.DEFAULT);
  });

  it('should return the LOAD strategy based on the unmapped_fields setting', () => {
    const headers = [synth.header`SET unmapped_fields = "LOAD"`];
    const strategy = getUnmappedFieldsStrategy(headers);
    expect(strategy).toBe(UnmappedFieldsStrategy.LOAD);
  });

  it('should return the LOAD_ALL strategy based on the unmapped_fields setting', () => {
    const headers = [synth.header`SET unmapped_fields = "LOAD_ALL"`];
    const strategy = getUnmappedFieldsStrategy(headers);
    expect(strategy).toBe(UnmappedFieldsStrategy.LOAD_ALL);
  });

  it('should return the NULLIFY strategy based on the unmapped_fields setting', () => {
    const headers = [synth.header`SET unmapped_fields = "NULLIFY"`];
    const strategy = getUnmappedFieldsStrategy(headers);
    expect(strategy).toBe(UnmappedFieldsStrategy.NULLIFY);
  });

  it('should be case insensitive', () => {
    const headers = [synth.header`SET unmapped_fields = "nullify"`];
    const strategy = getUnmappedFieldsStrategy(headers);
    expect(strategy).toBe(UnmappedFieldsStrategy.NULLIFY);
  });
});

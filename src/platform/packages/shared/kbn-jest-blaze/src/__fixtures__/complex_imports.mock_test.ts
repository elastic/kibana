/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @kbn/imports/no_unresolvable_imports */
// Test file to verify complex import patterns and rewriting
import React, { useState, useEffect } from 'react';
import {
  FirstExport,
  SecondExport as RenamedSecondExport,
  ThirdExport,
  FourthExport,
  FifthExport,
  SixthExport,
  SeventhExport,
  // @ts-expect-error
} from './multi-export-package';

// Dynamic imports to test async loading
// @ts-expect-error
const asyncModule = () => import('./async-module');
// @ts-expect-error
const conditionalImport = () => import('./utils/conditional-helper');

describe('Complex Import Patterns', () => {
  test('should handle React imports', () => {
    expect(React).toBeDefined();
    expect(typeof useState).toBe('function');
    expect(typeof useEffect).toBe('function');
  });

  test('should all imports', () => {
    expect(FirstExport).toBeDefined();
    expect(RenamedSecondExport).toBeDefined();
    expect(ThirdExport).toBeDefined();
    expect(FourthExport).toBeDefined();
    expect(FifthExport).toBeDefined();
    expect(SixthExport).toBeDefined();
    expect(SeventhExport).toBeDefined();
  });

  test('should handle dynamic imports', async () => {
    const module = await asyncModule();
    expect(module).toBeDefined();
  });

  test('should handle conditional dynamic imports', async () => {
    if (true) {
      const helper = await conditionalImport();
      expect(helper).toBeDefined();
    }
  });

  test('should work with imported types', () => {
    // TypeImport is a type-only import, should be handled properly
    const mockData = { id: 'test', value: 123 };
    expect(mockData.id).toBe('test');
  });
});

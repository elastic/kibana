/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEuiComponentNamesFromPath } from './get_eui_component_names_from_path';

describe('getEuiComponentNamesFromPath', () => {
  it('should return an empty array for empty input', () => {
    expect(getEuiComponentNamesFromPath('')).toEqual([]);
    expect(getEuiComponentNamesFromPath(undefined as unknown as string)).toEqual([]);
  });

  it('should extract EUI component names from a simple path', () => {
    const path = 'EuiButton > EuiPanel';
    expect(getEuiComponentNamesFromPath(path)).toEqual(['EuiButton', 'EuiPanel']);
  });

  it('should ignore non-EUI components', () => {
    const path = 'EuiButton > CustomComponent > EuiPanel';
    expect(getEuiComponentNamesFromPath(path)).toEqual(['EuiButton', 'EuiPanel']);
  });

  it('should handle paths with colon notation', () => {
    const path = 'SomeComponent:EuiButton > EuiPanel';
    expect(getEuiComponentNamesFromPath(path)).toEqual(['EuiButton', 'EuiPanel']);
  });

  it('should trim whitespace from component names', () => {
    const path = 'EuiButton >   EuiPanel  > EuiCard';
    expect(getEuiComponentNamesFromPath(path)).toEqual(['EuiButton', 'EuiPanel', 'EuiCard']);
  });

  it('should handle complex nested paths with both a colon and components', () => {
    const path = 'App:EuiButton > NonEuiComponent > EuiPanel > EuiCard';
    expect(getEuiComponentNamesFromPath(path)).toEqual(['EuiButton', 'EuiPanel', 'EuiCard']);
  });
});

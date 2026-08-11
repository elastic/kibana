/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AUTO_ANNOTATION_COLOR,
  darkModeDefaultAnnotationRangeColor,
  defaultAnnotationColor,
  getPersistedAnnotationColor,
  getResolvedAnnotationColor,
} from './util';

describe('event annotation color helpers', () => {
  it('persists auto when no annotation color is defined', () => {
    expect(getPersistedAnnotationColor(undefined)).toBe(AUTO_ANNOTATION_COLOR);
  });

  it('resolves auto point annotation colors from the light theme by default', () => {
    expect(
      getResolvedAnnotationColor({
        color: AUTO_ANNOTATION_COLOR,
      })
    ).toBe(defaultAnnotationColor);
  });

  it('resolves auto range annotation colors from the dark theme', () => {
    expect(
      getResolvedAnnotationColor({
        color: AUTO_ANNOTATION_COLOR,
        isDarkMode: true,
        isRange: true,
      })
    ).toBe(darkModeDefaultAnnotationRangeColor);
  });
});

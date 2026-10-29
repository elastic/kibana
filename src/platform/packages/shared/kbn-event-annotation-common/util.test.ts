/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlEventAnnotationConfig, EventAnnotationConfig } from './types';
import {
  AUTO_ANNOTATION_COLOR,
  darkModeDefaultAnnotationRangeColor,
  defaultAnnotationColor,
  getPersistedAnnotationColor,
  getResolvedAnnotationColor,
  getDefaultManualAnnotation,
  getDefaultQueryAnnotation,
  isEsqlAnnotationConfig,
} from './util';

describe('isEsqlAnnotationConfig', () => {
  const pointAnnotation: EsqlEventAnnotationConfig = {
    id: 'deployments',
    type: 'esql',
    query: { esql: 'FROM deployments | KEEP @timestamp, version, service' },
    key: { type: 'point_in_time' },
    timeColumn: '@timestamp',
    textColumn: 'version',
    extraColumns: ['service'],
    label: 'Deployments',
    icon: 'triangle',
    textVisibility: true,
  };

  const rangeAnnotation: EsqlEventAnnotationConfig = {
    id: 'maintenance',
    type: 'esql',
    query: { esql: 'FROM maintenance | KEEP start, end' },
    key: { type: 'range' },
    timeColumn: 'start',
    endTimeColumn: 'end',
    label: 'Maintenance',
    outside: false,
  };

  it.each([pointAnnotation, rangeAnnotation])('recognizes $key.type annotations', (annotation) => {
    expect(isEsqlAnnotationConfig(annotation)).toBe(true);
  });

  it.each<{ name: string; annotation?: EventAnnotationConfig }>([
    { name: 'missing' },
    {
      name: 'manual point',
      annotation: getDefaultManualAnnotation('point', '2026-01-01T00:00:00Z'),
    },
    {
      name: 'manual range',
      annotation: {
        id: 'range',
        type: 'manual',
        key: {
          type: 'range',
          timestamp: '2026-01-01T00:00:00Z',
          endTimestamp: '2026-01-02T00:00:00Z',
        },
        label: 'Maintenance',
      },
    },
    {
      name: 'DSL query',
      annotation: getDefaultQueryAnnotation('query', 'service', '@timestamp'),
    },
  ])('rejects $name annotations', ({ annotation }) => {
    expect(isEsqlAnnotationConfig(annotation)).toBe(false);
  });
});

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

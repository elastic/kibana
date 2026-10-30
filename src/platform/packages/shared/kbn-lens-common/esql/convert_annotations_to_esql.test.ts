/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EsqlEventAnnotationConfig,
  PointInTimeEventAnnotationConfig,
  QueryPointEventAnnotationConfig,
} from '@kbn/event-annotation-common';
import {
  ANNOTATION_CONVERSION_TIME_FIELD,
  buildAnnotationConversionCases,
} from '@kbn/lens-test-helpers';
import type { IndexPattern, IndexPatternMap } from '../types';
import { convertQueryAnnotationsToEsql } from './convert_annotations_to_esql';

const indexPatterns = {
  logs: { id: 'logs', title: 'logs-*', timeFieldName: '@timestamp' } as IndexPattern,
} as IndexPatternMap;

const manualAnnotation: PointInTimeEventAnnotationConfig = {
  id: 'manual',
  type: 'manual',
  key: { type: 'point_in_time', timestamp: '2026-01-01T00:00:00Z' },
  label: 'Release',
};

const queryAnnotation: QueryPointEventAnnotationConfig = {
  id: 'deployments',
  type: 'query',
  filter: { type: 'kibana_query', query: 'event.action: "deploy"', language: 'kuery' },
  timeField: 'event.created',
  textField: 'service.version',
  textVisibility: true,
  extraFields: ['service.name', 'service.version'],
  key: { type: 'point_in_time' },
  label: 'Deployments',
  color: '#E7664C',
  icon: 'flag',
  lineStyle: 'dashed',
  lineWidth: 2,
  isHidden: false,
};

const annotationLayer = (annotations: unknown[], overrides = {}) => ({
  layerId: 'annotations',
  layerType: 'annotations',
  indexPatternId: 'logs',
  ignoreGlobalFilters: true,
  annotations,
  ...overrides,
});

describe('convertQueryAnnotationsToEsql', () => {
  it('converts query annotations and keeps other layers and manual annotations unchanged', () => {
    const dataLayer = { layerId: 'data', layerType: 'data' };
    const state = {
      legend: {},
      layers: [dataLayer, annotationLayer([manualAnnotation, queryAnnotation])],
    };

    expect(convertQueryAnnotationsToEsql(state, indexPatterns)).toEqual({
      legend: {},
      layers: [
        dataLayer,
        annotationLayer([
          manualAnnotation,
          {
            id: 'deployments',
            type: 'esql',
            key: { type: 'point_in_time' },
            query: {
              esql: 'FROM logs-* | WHERE KQL("""event.action: "deploy"""") | KEEP `event.created`, `service.version`, `service.name` | SORT `event.created` DESC | LIMIT 1000',
            },
            timeField: 'event.created',
            timeColumn: 'event.created',
            textColumn: 'service.version',
            extraColumns: ['service.name', 'service.version'],
            label: 'Deployments',
            color: '#E7664C',
            icon: 'flag',
            lineStyle: 'dashed',
            lineWidth: 2,
            textVisibility: true,
            isHidden: false,
          },
        ]),
      ],
    });
  });

  it.each([
    [
      'global filters apply to the layer',
      annotationLayer([queryAnnotation], { ignoreGlobalFilters: false }),
    ],
    [
      'its data view is not loaded',
      annotationLayer([queryAnnotation], { indexPatternId: 'missing' }),
    ],
    [
      'no time field can be resolved',
      annotationLayer([{ ...queryAnnotation, timeField: undefined }], { indexPatternId: 'noTime' }),
    ],
  ])('rejects a layer when %s', (_, layer) => {
    const patterns = {
      ...indexPatterns,
      noTime: { id: 'noTime', title: 'no-time' } as IndexPattern,
    };
    expect(convertQueryAnnotationsToEsql({ layers: [layer] }, patterns)).toBeUndefined();
  });

  it('accepts manual-only layers that apply global filters', () => {
    const state = { layers: [annotationLayer([manualAnnotation], { ignoreGlobalFilters: false })] };
    expect(convertQueryAnnotationsToEsql(state, indexPatterns)).toEqual(state);
  });
});

// Same index the Scout API layer binds, so unit and API layers pin the exact same queries.
const MATRIX_INDEX = 'logstash-*';

describe('annotation conversion case matrix (query assertions)', () => {
  const matrixIndexPatterns = {
    logstash: {
      id: 'logstash',
      title: MATRIX_INDEX,
      timeFieldName: ANNOTATION_CONVERSION_TIME_FIELD,
    } as IndexPattern,
  } as IndexPatternMap;

  for (const conversionCase of buildAnnotationConversionCases({ index: MATRIX_INDEX })) {
    it(`converts: ${conversionCase.description}`, () => {
      const { filter, extraFields, ...annotation } = conversionCase.annotation;
      const state = convertQueryAnnotationsToEsql(
        {
          layers: [
            annotationLayer(
              [
                {
                  id: 'annotation',
                  type: 'query',
                  key: { type: 'point_in_time' },
                  label: 'Annotation',
                  ...annotation,
                  ...(filter ? { filter: { type: 'kibana_query', ...filter } } : {}),
                  ...(extraFields ? { extraFields: [...extraFields] } : {}),
                },
              ],
              { indexPatternId: 'logstash' }
            ),
          ],
        },
        matrixIndexPatterns
      ) as { layers: Array<{ annotations: EsqlEventAnnotationConfig[] }> };
      const [converted] = state.layers[0].annotations;

      expect(converted.query.esql).toBe(conversionCase.expectedEsql);
      expect(converted.timeColumn).toBe(conversionCase.expectedTimeColumn);
      expect(converted.timeField).toBe(conversionCase.expectedTimeColumn);
      expect(converted.textColumn).toBe(conversionCase.expectedTextColumn);
      expect(converted.extraColumns).toEqual(conversionCase.expectedExtraColumns);
    });
  }
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import {
  addAnomalyOverlayToAttributes,
  ANOMALY_OVERLAY_LAYER_ID,
  getAnomalyScoreColor,
} from './anomaly_overlay';

const createAttributes = (visualizationType = 'lnsXY') =>
  ({
    visualizationType,
    references: [{ type: 'index-pattern', id: 'data-view-id', name: 'indexpattern-datasource' }],
    state: {
      datasourceStates: {},
      visualization: { layers: [{ layerId: 'data', layerType: 'data' }] },
    },
  } as unknown as TypedLensByValueInput['attributes']);

const getLayers = (attributes: TypedLensByValueInput['attributes']) =>
  (attributes.state.visualization as { layers: Array<Record<string, any>> }).layers;

describe('getAnomalyScoreColor', () => {
  it.each([
    [2.9, undefined],
    [3, '#8BC8FB'],
    [25, '#FDEC25'],
    [50, '#FF7E62'],
    [75, '#FE5050'],
    [100, '#FE5050'],
  ])('maps a score of %s to %s', (score, color) => {
    expect(getAnomalyScoreColor(score)).toBe(color);
  });
});

describe('addAnomalyOverlayToAttributes', () => {
  const ranges = [
    {
      start: Date.parse('2026-01-01T00:00:00Z'),
      end: Date.parse('2026-01-01T01:00:00Z'),
      score: 80,
    },
    {
      start: Date.parse('2026-01-01T02:00:00Z'),
      end: Date.parse('2026-01-01T03:00:00Z'),
      score: 30,
    },
  ];

  it('returns the attributes unchanged when there are no ranges', () => {
    const attributes = createAttributes();
    expect(addAnomalyOverlayToAttributes(attributes, undefined)).toBe(attributes);
    expect(addAnomalyOverlayToAttributes(attributes, [])).toBe(attributes);
  });

  it('returns the attributes unchanged for a chart which is not an XY chart', () => {
    const attributes = createAttributes('lnsMetric');
    expect(addAnomalyOverlayToAttributes(attributes, ranges)).toBe(attributes);
  });

  it('ignores ranges which are scored too low to have a severity', () => {
    const attributes = createAttributes();
    expect(addAnomalyOverlayToAttributes(attributes, [{ start: 0, end: 1000, score: 1 }])).toBe(
      attributes
    );
  });

  it('adds an annotation layer with an outside range annotation per range', () => {
    const attributes = createAttributes();
    const layers = getLayers(addAnomalyOverlayToAttributes(attributes, ranges));

    expect(layers).toHaveLength(2);
    expect(layers[0]).toEqual({ layerId: 'data', layerType: 'data' });
    expect(layers[1]).toMatchObject({
      layerId: ANOMALY_OVERLAY_LAYER_ID,
      layerType: 'annotations',
      indexPatternId: 'data-view-id',
      ignoreGlobalFilters: true,
    });
    expect(layers[1].annotations).toEqual([
      expect.objectContaining({
        key: {
          type: 'range',
          timestamp: '2026-01-01T00:00:00.000Z',
          endTimestamp: '2026-01-01T01:00:00.000Z',
        },
        color: 'rgba(254, 80, 80, 0.6)',
        outside: true,
      }),
      expect.objectContaining({
        key: {
          type: 'range',
          timestamp: '2026-01-01T02:00:00.000Z',
          endTimestamp: '2026-01-01T03:00:00.000Z',
        },
        color: 'rgba(253, 236, 37, 0.6)',
        outside: true,
      }),
    ]);
  });

  describe('hover areas', () => {
    const timeRange = {
      from: Date.parse('2026-01-01T00:00:00Z'),
      to: Date.parse('2026-01-01T04:00:00Z'),
    };

    const getAnnotations = (rangesToShow = ranges) =>
      getLayers(addAnomalyOverlayToAttributes(createAttributes(), rangesToShow, timeRange))[1]
        .annotations as Array<{
        id: string;
        color: string;
        key: { timestamp: string; endTimestamp: string };
      }>;

    it('covers the time between and around the anomalies with transparent annotations', () => {
      const hoverAreas = getAnnotations().filter(({ id }) => id.startsWith('anomaly-hover-area'));
      expect(hoverAreas.map(({ key }) => [key.timestamp, key.endTimestamp])).toEqual([
        ['2026-01-01T01:00:00.000Z', '2026-01-01T02:00:00.000Z'],
        ['2026-01-01T03:00:00.000Z', '2026-01-01T04:00:00.000Z'],
      ]);
      expect(hoverAreas.every(({ color }) => color === 'rgba(0, 0, 0, 0)')).toBe(true);
    });

    it('does not add a hover area between anomalies which touch', () => {
      const touching = [
        { start: timeRange.from, end: timeRange.from + 3600 * 1000, score: 80 },
        { start: timeRange.from + 3600 * 1000, end: timeRange.to, score: 60 },
      ];
      expect(getAnnotations(touching).filter(({ id }) => id.includes('hover-area'))).toEqual([]);
    });

    it('is not added without a time range', () => {
      const layers = getLayers(addAnomalyOverlayToAttributes(createAttributes(), ranges));
      expect(layers[1].annotations).toHaveLength(2);
    });

    it('adds no layer when no anomaly has a severity', () => {
      const attributes = createAttributes();
      expect(
        addAnomalyOverlayToAttributes(attributes, [{ start: 0, end: 1000, score: 1 }], timeRange)
      ).toBe(attributes);
    });
  });

  it('uses the ad hoc data view of an ES|QL chart', () => {
    const attributes = {
      visualizationType: 'lnsXY',
      references: [],
      state: {
        datasourceStates: { textBased: { layers: { layer1: { index: 'adhoc-id', columns: [] } } } },
        visualization: { layers: [] },
      },
    } as unknown as TypedLensByValueInput['attributes'];

    expect(getLayers(addAnomalyOverlayToAttributes(attributes, ranges))[0]).toMatchObject({
      indexPatternId: 'adhoc-id',
    });
  });

  it('returns the attributes unchanged when the chart has no data view', () => {
    const attributes = {
      visualizationType: 'lnsXY',
      references: [],
      state: { datasourceStates: {}, visualization: { layers: [] } },
    } as unknown as TypedLensByValueInput['attributes'];

    expect(addAnomalyOverlayToAttributes(attributes, ranges)).toBe(attributes);
  });

  it('does not change the original attributes', () => {
    const attributes = createAttributes();
    addAnomalyOverlayToAttributes(attributes, ranges);
    expect(getLayers(attributes)).toHaveLength(1);
  });
});

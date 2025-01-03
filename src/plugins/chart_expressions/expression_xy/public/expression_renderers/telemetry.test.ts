/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CommonXYLayerConfig, LayerTypes } from '../../common';
import { AnnotationLayerConfig, DataLayerConfig, XYProps } from '../../common/types';
import {
  createArgsWithLayers,
  sampleAnnotationLayer,
  sampleLayer,
  sampleReferenceLineLayer,
} from '../../common/__mocks__';
import { getDataLayers } from '../helpers';
import { extractCounterEvents } from './xy_chart_renderer';

type PossibleLayerTypes =
  | typeof LayerTypes.DATA
  | typeof LayerTypes.ANNOTATIONS
  | typeof LayerTypes.REFERENCELINE;

function createLayer(type: PossibleLayerTypes) {
  switch (type) {
    case LayerTypes.ANNOTATIONS: {
      return { ...sampleAnnotationLayer };
    }
    case LayerTypes.REFERENCELINE: {
      return { ...sampleReferenceLineLayer };
    }
    case LayerTypes.DATA:
    default: {
      return { ...sampleLayer };
    }
  }
}
function createLayers(
  layerConfigs: Partial<Record<CommonXYLayerConfig['layerType'], { count: number }>>
): CommonXYLayerConfig[] {
  const layers = [];
  for (const [type, { count }] of Object.entries(layerConfigs)) {
    layers.push(
      ...Array.from({ length: count }, () => createLayer(type as CommonXYLayerConfig['layerType']))
    );
  }
  return layers;
}

function createAnnotations(count: number) {
  return Array.from({ length: count }, () => createLayer('annotations') as AnnotationLayerConfig);
}

function getXYProps(
  layersConfig: CommonXYLayerConfig[],
  annotations?: AnnotationLayerConfig[]
): XYProps {
  const args = createArgsWithLayers(layersConfig);
  if (annotations?.length) {
    if (!args.annotations) {
      args.annotations = {
        type: 'event_annotations_result',
        layers: [],
        datatable: {
          type: 'datatable',
          columns: [],
          rows: [],
        },
      };
    }
    args.annotations!.layers = annotations;
  }
  return args;
}

describe('should emit the right telemetry events', () => {
  it('should emit the telemetry event for a single data layer', () => {
    expect(
      extractCounterEvents('lens', getXYProps(createLayers({ data: { count: 1 } })), false, {
        getDataLayers,
      })
    ).toMatchInlineSnapshot(`
      Array [
        "render_lens_line",
      ]
    `);
  });

  it('should emit the telemetry event for multiple data layers', () => {
    expect(
      extractCounterEvents('lens', getXYProps(createLayers({ data: { count: 2 } })), false, {
        getDataLayers,
      })
    ).toMatchInlineSnapshot(`
      Array [
        "render_lens_line",
        "render_lens_multiple_data_layers",
      ]
    `);
  });

  it('should emit the telemetry event for multiple data layers with mixed types', () => {
    const layers = createLayers({ data: { count: 2 } });
    // change layer 2 to be bar stacked
    (layers[1] as DataLayerConfig).seriesType = 'bar';
    (layers[1] as DataLayerConfig).isStacked = true;
    expect(
      extractCounterEvents('lens', getXYProps(layers), false, {
        getDataLayers,
      })
    ).toMatchInlineSnapshot(`
      Array [
        "render_lens_line",
        "render_lens_multiple_data_layers",
        "render_lens_mixed_xy",
      ]
    `);
  });

  it('should emit the telemetry dedicated event for percentage charts', () => {
    const layers = createLayers({ data: { count: 1 } });
    // change layer 2 to be bar stacked
    (layers[0] as DataLayerConfig).seriesType = 'bar';
    (layers[0] as DataLayerConfig).isPercentage = true;
    (layers[0] as DataLayerConfig).isStacked = true;
    expect(
      extractCounterEvents('lens', getXYProps(layers), false, {
        getDataLayers,
      })
    ).toMatchInlineSnapshot(`
      Array [
        "render_lens_vertical_bar_percentage_stacked",
      ]
    `);
  });

  it('should emit the telemetry event for a data layer and an additonal reference line layer', () => {
    expect(
      extractCounterEvents(
        'lens',
        getXYProps(createLayers({ data: { count: 1 }, referenceLine: { count: 1 } })),
        false,
        { getDataLayers }
      )
    ).toMatchInlineSnapshot(`
      Array [
        "render_lens_line",
        "render_lens_reference_layer",
      ]
    `);
  });

  it('should emit the telemetry event for a data layer and an additional annotations layer', () => {
    expect(
      extractCounterEvents(
        'lens',
        getXYProps(createLayers({ data: { count: 1 } }), createAnnotations(1)),
        false,
        { getDataLayers }
      )
    ).toMatchInlineSnapshot(`
      Array [
        "render_lens_line",
        "render_lens_annotation_layer",
      ]
    `);
  });

  it('should emit the telemetry event for a scenario with the navigate to lens feature', () => {
    expect(
      extractCounterEvents(
        'lens',
        getXYProps(
          createLayers({ data: { count: 1 }, referenceLine: { count: 1 } }),
          createAnnotations(1)
        ),
        true,
        { getDataLayers }
      )
    ).toMatchInlineSnapshot(`
      Array [
        "render_lens_line",
        "render_lens_reference_layer",
        "render_lens_annotation_layer",
        "render_lens_render_line_convertable",
      ]
    `);
  });
});

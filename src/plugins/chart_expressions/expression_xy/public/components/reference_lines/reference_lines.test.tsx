/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Chart, LineAnnotation, RectAnnotation } from '@elastic/charts';
import { mount, shallow } from 'enzyme';
import React from 'react';
import { Datatable } from '@kbn/expressions-plugin/common';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { LayerTypes } from '../../../common/constants';
import {
  ReferenceLineLayerArgs,
  ReferenceLineLayerConfig,
  ExtendedReferenceLineDecorationConfig,
  ReferenceLineArgs,
  ReferenceLineConfig,
} from '../../../common/types';
import { ReferenceLines, ReferenceLinesProps } from './reference_lines';
import { ReferenceLineLayer } from './reference_line_layer';
import { ReferenceLine } from './reference_line';
import { ReferenceLineAnnotations } from './reference_line_annotations';

const row: Record<string, number> = {
  xAccessorFirstId: 1,
  xAccessorSecondId: 2,
  yAccessorLeftFirstId: 5,
  yAccessorLeftSecondId: 10,
  yAccessorRightFirstId: 5,
  yAccessorRightSecondId: 10,
};

const data: Datatable = {
  type: 'datatable',
  rows: [row],
  columns: Object.keys(row).map((id) => ({
    id,
    name: `Static value: ${row[id]}`,
    meta: {
      type: 'number',
      params: { id: 'number' },
    },
  })),
};

function createLayers(
  decorations: ReferenceLineLayerArgs['decorations'],
  table?: Datatable
): ReferenceLineLayerConfig[] {
  return [
    {
      layerId: 'first',
      accessors: (decorations || []).map(({ forAccessor }) => forAccessor),
      decorations,
      type: 'referenceLineLayer',
      layerType: LayerTypes.REFERENCELINE,
      table: table || data,
    },
  ];
}

function createReferenceLine(
  layerId: string,
  lineLength: number,
  args: ReferenceLineArgs
): ReferenceLineConfig {
  return {
    layerId,
    type: 'referenceLine',
    layerType: 'referenceLine',
    lineLength,
    decorations: [{ type: 'extendedReferenceLineDecorationConfig', ...args }],
  };
}

interface YCoords {
  y0: number | undefined;
  y1: number | undefined;
}
interface XCoords {
  x0: number | undefined;
  x1: number | undefined;
}

function getAxisFromId(layerPrefix: string): ExtendedReferenceLineDecorationConfig['position'] {
  return /left/i.test(layerPrefix) ? 'left' : /right/i.test(layerPrefix) ? 'right' : 'bottom';
}

const emptyCoords = { x0: undefined, x1: undefined, y0: undefined, y1: undefined };

describe('ReferenceLines', () => {
  describe('referenceLineLayers', () => {
    let defaultProps: Omit<ReferenceLinesProps, 'data' | 'layers'>;

    beforeEach(() => {
      defaultProps = {
        formatters: {},
        xAxisFormatter: { convert: jest.fn((x) => x) } as unknown as FieldFormat,
        isHorizontal: false,
        axesConfiguration: [
          {
            groupId: 'left',
            position: 'left',
            series: [],
          },
          {
            groupId: 'right',
            position: 'right',
            series: [],
          },
          {
            groupId: 'bottom',
            position: 'bottom',
            series: [],
          },
        ],
        paddingMap: {},
        yAxesMap: {
          left: {
            groupId: 'left',
            position: 'left',
            series: [],
          },
          right: {
            groupId: 'right',
            position: 'right',
            series: [],
          },
        },
      };
    });

    it('should not throw on null data', () => {
      const position = getAxisFromId('yAccessorLeft');
      const [layer] = createLayers([
        {
          forAccessor: `yAccessorLeftFirstId`,
          position,
          lineStyle: 'solid',
          fill: 'above',
          type: 'referenceLineDecorationConfig',
        },
      ]);
      expect(() =>
        mount(
          <Chart>
            <ReferenceLines
              {...defaultProps}
              layers={[
                {
                  ...layer,
                  table: {
                    ...layer.table,
                    rows: [{}],
                    columns: [{ ...layer.table.columns[0], meta: { type: 'number' } }],
                  },
                },
              ]}
            />
          </Chart>
        )
      ).not.toThrow();
    });

    it('should prefer column formatter over x axis default one', () => {
      const convertLeft = jest.fn((x) => `left-${x}`);
      const convertRight = jest.fn((x) => `right-${x}`);
      const wrapper = shallow(
        <ReferenceLines
          {...defaultProps}
          formatters={{
            yAccessorLeftFirstId: { convert: convertLeft } as unknown as FieldFormat,
            yAccessorRightFirstId: { convert: convertRight } as unknown as FieldFormat,
          }}
          layers={createLayers(
            [
              {
                forAccessor: `yAccessorLeftFirstId`,
                position: getAxisFromId('yAccessorLeft'),
                lineStyle: 'solid',
                fill: undefined,
                type: 'referenceLineDecorationConfig',
              },
              {
                forAccessor: `yAccessorRightFirstId`,
                position: getAxisFromId('yAccessorRight'),
                lineStyle: 'solid',
                fill: 'above',
                type: 'referenceLineDecorationConfig',
              },
            ],
            {
              type: 'datatable',
              rows: [row],
              columns: Object.keys(row).map((id) => ({
                id,
                name: `Static value: ${row[id]}`,
                meta: {
                  type: 'number',
                  params: { id: 'number', params: { formatOverride: true, pattern: '0.0' } },
                },
              })),
            }
          )}
        />
      );
      const referenceLineLayer = wrapper.find(ReferenceLineLayer).dive();
      const annotations = referenceLineLayer.find(ReferenceLineAnnotations);
      expect(annotations.first().dive().find(LineAnnotation).prop('dataValues')).toEqual(
        expect.arrayContaining([{ dataValue: 5, details: `left-5`, header: undefined }])
      );
      expect(annotations.last().dive().find(RectAnnotation).prop('dataValues')).toEqual(
        expect.arrayContaining([
          {
            coordinates: { x0: undefined, x1: undefined, y0: 5, y1: undefined },
            details: `right-5`,
            header: undefined,
          },
        ])
      );

      expect(convertLeft).toHaveBeenCalled();
      expect(convertRight).toHaveBeenCalled();
      expect(defaultProps.xAxisFormatter.convert).not.toHaveBeenCalled();
    });

    it.each([
      ['yAccessorLeft', 'above'],
      ['yAccessorLeft', 'below'],
      ['yAccessorRight', 'above'],
      ['yAccessorRight', 'below'],
    ] as Array<[string, Exclude<ExtendedReferenceLineDecorationConfig['fill'], undefined>]>)(
      'should render a RectAnnotation for a reference line with fill set: %s %s',
      (layerPrefix, fill) => {
        const position = getAxisFromId(layerPrefix);
        const wrapper = shallow(
          <ReferenceLines
            {...defaultProps}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                position,
                lineStyle: 'solid',
                fill,
                type: 'referenceLineDecorationConfig',
              },
            ])}
          />
        );
        const referenceLineLayer = wrapper.find(ReferenceLineLayer).dive();

        const y0 = fill === 'above' ? 5 : undefined;
        const y1 = fill === 'above' ? undefined : 5;

        const referenceLineAnnotation = referenceLineLayer.find(ReferenceLineAnnotations).dive();
        expect(referenceLineAnnotation.find(LineAnnotation).exists()).toBe(true);
        expect(referenceLineAnnotation.find(RectAnnotation).exists()).toBe(true);
        expect(referenceLineAnnotation.find(RectAnnotation).prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { x0: undefined, x1: undefined, y0, y1 },
              details: y0 ?? y1,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each([
      ['xAccessor', 'above'],
      ['xAccessor', 'below'],
    ] as Array<[string, Exclude<ExtendedReferenceLineDecorationConfig['fill'], undefined>]>)(
      'should render a RectAnnotation for a reference line with fill set: %s %s',
      (layerPrefix, fill) => {
        const wrapper = shallow(
          <ReferenceLines
            {...defaultProps}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                position: 'bottom',
                lineStyle: 'solid',
                type: 'referenceLineDecorationConfig',
                fill,
              },
            ])}
          />
        );
        const referenceLineLayer = wrapper.find(ReferenceLineLayer).dive();

        const x0 = fill === 'above' ? 1 : undefined;
        const x1 = fill === 'above' ? undefined : 1;

        const referenceLineAnnotation = referenceLineLayer.find(ReferenceLineAnnotations).dive();
        expect(referenceLineAnnotation.find(LineAnnotation).exists()).toBe(true);
        expect(referenceLineAnnotation.find(RectAnnotation).exists()).toBe(true);
        expect(referenceLineAnnotation.find(RectAnnotation).prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, x0, x1 },
              details: x0 ?? x1,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each([
      ['yAccessorLeft', 'above', { y0: 5, y1: 10 }, { y0: 10, y1: undefined }],
      ['yAccessorLeft', 'below', { y0: undefined, y1: 5 }, { y0: 5, y1: 10 }],
      ['yAccessorRight', 'above', { y0: 5, y1: 10 }, { y0: 10, y1: undefined }],
      ['yAccessorRight', 'below', { y0: undefined, y1: 5 }, { y0: 5, y1: 10 }],
    ] as Array<[string, Exclude<ExtendedReferenceLineDecorationConfig['fill'], undefined>, YCoords, YCoords]>)(
      'should avoid overlap between two reference lines with fill in the same direction: 2 x %s %s',
      (layerPrefix, fill, coordsA, coordsB) => {
        const position = getAxisFromId(layerPrefix);
        const wrapper = shallow(
          <ReferenceLines
            {...defaultProps}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                position,
                lineStyle: 'solid',
                type: 'referenceLineDecorationConfig',
                fill,
              },
              {
                forAccessor: `${layerPrefix}SecondId`,
                position,
                lineStyle: 'solid',
                type: 'referenceLineDecorationConfig',
                fill,
              },
            ])}
          />
        );
        const referenceLineLayer = wrapper.find(ReferenceLineLayer).dive();
        const referenceLineAnnotations = referenceLineLayer.find(ReferenceLineAnnotations);

        expect(
          referenceLineAnnotations.first().dive().find(RectAnnotation).prop('dataValues')
        ).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsA },
              details: coordsA.y0 ?? coordsA.y1,
              header: undefined,
            },
          ])
        );
        expect(
          referenceLineAnnotations.last().dive().find(RectAnnotation).prop('dataValues')
        ).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsB },
              details: coordsB.y1 ?? coordsB.y0,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each([
      ['xAccessor', 'above', { x0: 1, x1: 2 }, { x0: 2, x1: undefined }],
      ['xAccessor', 'below', { x0: undefined, x1: 1 }, { x0: 1, x1: 2 }],
    ] as Array<[string, Exclude<ExtendedReferenceLineDecorationConfig['fill'], undefined>, XCoords, XCoords]>)(
      'should avoid overlap between two reference lines with fill in the same direction: 2 x %s %s',
      (layerPrefix, fill, coordsA, coordsB) => {
        const wrapper = shallow(
          <ReferenceLines
            {...defaultProps}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                position: 'bottom',
                lineStyle: 'solid',
                type: 'referenceLineDecorationConfig',
                fill,
              },
              {
                forAccessor: `${layerPrefix}SecondId`,
                position: 'bottom',
                lineStyle: 'solid',
                type: 'referenceLineDecorationConfig',
                fill,
              },
            ])}
          />
        );
        const referenceLineLayer = wrapper.find(ReferenceLineLayer).dive();
        const referenceLineAnnotations = referenceLineLayer.find(ReferenceLineAnnotations);

        expect(
          referenceLineAnnotations.first().dive().find(RectAnnotation).prop('dataValues')
        ).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsA },
              details: coordsA.x0 ?? coordsA.x1,
              header: undefined,
            },
          ])
        );
        expect(
          referenceLineAnnotations.last().dive().find(RectAnnotation).prop('dataValues')
        ).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsB },
              details: coordsB.x1 ?? coordsB.x0,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each(['yAccessorLeft', 'yAccessorRight', 'xAccessor'])(
      'should let areas in different directions overlap: %s',
      (layerPrefix) => {
        const position = getAxisFromId(layerPrefix);

        const wrapper = shallow(
          <ReferenceLines
            {...defaultProps}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                position,
                lineStyle: 'solid',
                fill: 'above',
                type: 'referenceLineDecorationConfig',
              },
              {
                forAccessor: `${layerPrefix}SecondId`,
                position,
                lineStyle: 'solid',
                fill: 'below',
                type: 'referenceLineDecorationConfig',
              },
            ])}
          />
        );
        const referenceLineLayer = wrapper.find(ReferenceLineLayer).dive();
        const referenceLineAnnotations = referenceLineLayer.find(ReferenceLineAnnotations);

        expect(
          referenceLineAnnotations.first().dive().find(RectAnnotation).prop('dataValues')
        ).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...(position === 'bottom' ? { x0: 1 } : { y0: 5 }) },
              details: position === 'bottom' ? 1 : 5,
              header: undefined,
            },
          ])
        );
        expect(
          referenceLineAnnotations.last().dive().find(RectAnnotation).prop('dataValues')
        ).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...(position === 'bottom' ? { x1: 2 } : { y1: 10 }) },
              details: position === 'bottom' ? 2 : 10,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each([
      ['above', { y0: 5, y1: 10 }, { y0: 10, y1: undefined }],
      ['below', { y0: undefined, y1: 5 }, { y0: 5, y1: 10 }],
    ] as Array<[Exclude<ExtendedReferenceLineDecorationConfig['fill'], undefined>, YCoords, YCoords]>)(
      'should allow overlap for different axes when on same direction on different axes: 1x Left + 1x Right both %s',
      (fill, coordsA, coordsB) => {
        const wrapper = shallow(
          <ReferenceLines
            {...defaultProps}
            layers={createLayers([
              {
                forAccessor: `yAccessorLeftFirstId`,
                position: 'left',
                lineStyle: 'solid',
                fill,
                type: 'referenceLineDecorationConfig',
              },
              {
                forAccessor: `yAccessorRightSecondId`,
                position: 'right',
                lineStyle: 'solid',
                fill,
                type: 'referenceLineDecorationConfig',
              },
            ])}
          />
        );
        const referenceLineLayer = wrapper.find(ReferenceLineLayer).dive();
        const referenceLineAnnotations = referenceLineLayer.find(ReferenceLineAnnotations);

        expect(
          referenceLineAnnotations.first().dive().find(RectAnnotation).prop('dataValues')
        ).toEqual(
          expect.arrayContaining([
            {
              coordinates: {
                ...emptyCoords,
                ...coordsA,
                [fill === 'above' ? 'y1' : 'y0']: undefined,
              },
              details: coordsA.y0 ?? coordsA.y1,
              header: undefined,
            },
          ])
        );
        expect(
          referenceLineAnnotations.last().dive().find(RectAnnotation).prop('dataValues')
        ).toEqual(
          expect.arrayContaining([
            {
              coordinates: {
                ...emptyCoords,
                ...coordsB,
                [fill === 'above' ? 'y1' : 'y0']: undefined,
              },
              details: coordsB.y1 ?? coordsB.y0,
              header: undefined,
            },
          ])
        );
      }
    );
  });

  describe('referenceLines', () => {
    let defaultProps: Omit<ReferenceLinesProps, 'data' | 'layers'>;

    beforeEach(() => {
      defaultProps = {
        formatters: {},
        xAxisFormatter: { convert: jest.fn((x) => x) } as unknown as FieldFormat,
        isHorizontal: false,
        axesConfiguration: [
          {
            groupId: 'left',
            position: 'left',
            series: [],
          },
          {
            groupId: 'right',
            position: 'right',
            series: [],
          },
          {
            groupId: 'bottom',
            position: 'bottom',
            series: [],
          },
        ],
        paddingMap: {},
        yAxesMap: {
          left: {
            groupId: 'left',
            position: 'left',
            series: [],
          },
          right: {
            groupId: 'right',
            position: 'right',
            series: [],
          },
        },
      };
    });

    it.each([
      ['yAccessorLeft', 'above'],
      ['yAccessorLeft', 'below'],
      ['yAccessorRight', 'above'],
      ['yAccessorRight', 'below'],
    ] as Array<[string, Exclude<ExtendedReferenceLineDecorationConfig['fill'], undefined>]>)(
      'should render a RectAnnotation for a reference line with fill set: %s %s',
      (layerPrefix, fill) => {
        const position = getAxisFromId(layerPrefix);
        const value = 5;
        const wrapper = shallow(
          <ReferenceLines
            {...defaultProps}
            layers={[
              createReferenceLine(layerPrefix, 1, {
                position,
                lineStyle: 'solid',
                fill,
                value,
                forAccessor: '',
              }),
            ]}
          />
        );
        const referenceLine = wrapper.find(ReferenceLine).dive();
        const referenceLineAnnotation = referenceLine.find(ReferenceLineAnnotations).dive();

        const y0 = fill === 'above' ? value : undefined;
        const y1 = fill === 'above' ? undefined : value;

        expect(referenceLineAnnotation.find(LineAnnotation).exists()).toBe(true);
        expect(referenceLineAnnotation.find(RectAnnotation).exists()).toBe(true);
        expect(referenceLineAnnotation.find(RectAnnotation).prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { x0: undefined, x1: undefined, y0, y1 },
              details: y0 ?? y1,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each([
      ['xAccessor', 'above'],
      ['xAccessor', 'below'],
    ] as Array<[string, Exclude<ExtendedReferenceLineDecorationConfig['fill'], undefined>]>)(
      'should render a RectAnnotation for a reference line with fill set: %s %s',
      (layerPrefix, fill) => {
        const value = 1;
        const wrapper = shallow(
          <ReferenceLines
            {...defaultProps}
            layers={[
              createReferenceLine(layerPrefix, 1, {
                position: 'bottom',
                lineStyle: 'solid',
                fill,
                value,
                forAccessor: '',
              }),
            ]}
          />
        );
        const referenceLine = wrapper.find(ReferenceLine).dive();
        const referenceLineAnnotation = referenceLine.find(ReferenceLineAnnotations).dive();

        const x0 = fill === 'above' ? value : undefined;
        const x1 = fill === 'above' ? undefined : value;

        expect(referenceLineAnnotation.find(LineAnnotation).exists()).toBe(true);
        expect(referenceLineAnnotation.find(RectAnnotation).exists()).toBe(true);
        expect(referenceLineAnnotation.find(RectAnnotation).prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, x0, x1 },
              details: x0 ?? x1,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each([
      ['yAccessorLeft', 'above', { y0: 10, y1: undefined }, { y0: 10, y1: undefined }],
      ['yAccessorLeft', 'below', { y0: undefined, y1: 5 }, { y0: undefined, y1: 5 }],
    ] as Array<[string, Exclude<ExtendedReferenceLineDecorationConfig['fill'], undefined>, YCoords, YCoords]>)(
      'should avoid overlap between two reference lines with fill in the same direction: 2 x %s %s',
      (layerPrefix, fill, coordsA, coordsB) => {
        const position = getAxisFromId(layerPrefix);
        const value = coordsA.y0 ?? coordsA.y1!;
        const wrapper = shallow(
          <ReferenceLines
            {...defaultProps}
            layers={[
              createReferenceLine(layerPrefix, 10, {
                position,
                lineStyle: 'solid',
                fill,
                value,
                forAccessor: '',
              }),
              createReferenceLine(layerPrefix, 10, {
                position,
                lineStyle: 'solid',
                fill,
                value,
                forAccessor: '',
              }),
            ]}
          />
        );
        const referenceLine = wrapper.find(ReferenceLine).first().dive();
        const referenceLineAnnotation = referenceLine.find(ReferenceLineAnnotations).dive();

        expect(referenceLineAnnotation.find(RectAnnotation).first().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsA },
              details: value,
              header: undefined,
            },
          ])
        );
        expect(referenceLineAnnotation.find(RectAnnotation).last().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsB },
              details: value,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each([
      ['xAccessor', 'above', { x0: 1, x1: undefined }, { x0: 1, x1: undefined }],
      ['xAccessor', 'below', { x0: undefined, x1: 1 }, { x0: undefined, x1: 1 }],
    ] as Array<[string, Exclude<ExtendedReferenceLineDecorationConfig['fill'], undefined>, XCoords, XCoords]>)(
      'should avoid overlap between two reference lines with fill in the same direction: 2 x %s %s',
      (layerPrefix, fill, coordsA, coordsB) => {
        const value = coordsA.x0 ?? coordsA.x1!;
        const wrapper = shallow(
          <ReferenceLines
            {...defaultProps}
            layers={[
              createReferenceLine(layerPrefix, 10, {
                position: 'bottom',
                lineStyle: 'solid',
                fill,
                value,
                forAccessor: '',
              }),
              createReferenceLine(layerPrefix, 10, {
                position: 'bottom',
                lineStyle: 'solid',
                fill,
                value,
                forAccessor: '',
              }),
            ]}
          />
        );
        const referenceLine1 = wrapper.find(ReferenceLine).first().dive();
        const referenceLineAnnotation1 = referenceLine1.find(ReferenceLineAnnotations).dive();

        expect(referenceLineAnnotation1.find(RectAnnotation).first().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsA },
              details: value,
              header: undefined,
            },
          ])
        );

        const referenceLine2 = wrapper.find(ReferenceLine).last().dive();
        const referenceLineAnnotation2 = referenceLine2.find(ReferenceLineAnnotations).dive();

        expect(referenceLineAnnotation2.find(RectAnnotation).last().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsB },
              details: value,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each(['yAccessorLeft', 'yAccessorRight', 'xAccessor'])(
      'should let areas in different directions overlap: %s',
      (layerPrefix) => {
        const position = getAxisFromId(layerPrefix);
        const value1 = 1;
        const value2 = 10;
        const wrapper = shallow(
          <ReferenceLines
            {...defaultProps}
            layers={[
              createReferenceLine(layerPrefix, 10, {
                position,
                lineStyle: 'solid',
                fill: 'above',
                value: value1,
                forAccessor: '',
              }),
              createReferenceLine(layerPrefix, 10, {
                position,
                lineStyle: 'solid',
                fill: 'below',
                value: value2,
                forAccessor: '',
              }),
            ]}
          />
        );
        const referenceLine1 = wrapper.find(ReferenceLine).first().dive();
        const referenceLineAnnotation1 = referenceLine1.find(ReferenceLineAnnotations).dive();

        expect(referenceLineAnnotation1.find(RectAnnotation).first().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: {
                ...emptyCoords,
                ...(position === 'bottom' ? { x0: value1 } : { y0: value1 }),
              },
              details: value1,
              header: undefined,
            },
          ])
        );

        const referenceLine2 = wrapper.find(ReferenceLine).last().dive();
        const referenceLineAnnotation2 = referenceLine2.find(ReferenceLineAnnotations).dive();

        expect(referenceLineAnnotation2.find(RectAnnotation).last().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: {
                ...emptyCoords,
                ...(position === 'bottom' ? { x1: value2 } : { y1: value2 }),
              },
              details: value2,
              header: undefined,
            },
          ])
        );
      }
    );
  });
});

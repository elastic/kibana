/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LineAnnotation, Position, RectAnnotation } from '@elastic/charts';
import { shallow } from 'enzyme';
import React from 'react';
import { Datatable } from '../../../../expressions';
import { FieldFormat } from '../../../../field_formats/common';
import { LayerTypes } from '../../common/constants';
import {
  ReferenceLineLayerArgs,
  ReferenceLineLayerConfigResult,
  ExtendedYConfig,
} from '../../common/types';
import { ReferenceLineAnnotations, ReferenceLineAnnotationsProps } from './reference_lines';

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
  yConfigs: ReferenceLineLayerArgs['yConfig']
): ReferenceLineLayerConfigResult[] {
  return [
    {
      accessors: (yConfigs || []).map(({ forAccessor }) => forAccessor),
      yConfig: yConfigs,
      type: 'referenceLineLayer',
      layerType: LayerTypes.REFERENCELINE,
      table: data,
    },
  ];
}

interface YCoords {
  y0: number | undefined;
  y1: number | undefined;
}
interface XCoords {
  x0: number | undefined;
  x1: number | undefined;
}

function getAxisFromId(layerPrefix: string): Position {
  return /left/i.test(layerPrefix) ? 'left' : /right/i.test(layerPrefix) ? 'right' : 'bottom';
}

const emptyCoords = { x0: undefined, x1: undefined, y0: undefined, y1: undefined };

describe('ReferenceLineAnnotations', () => {
  describe('with fill', () => {
    let defaultProps: Omit<ReferenceLineAnnotationsProps, 'data' | 'layers'>;

    beforeEach(() => {
      defaultProps = {
        xAxisFormatter: { convert: jest.fn((x) => x) } as unknown as FieldFormat,
        isHorizontal: false,
        yAxesConfiguration: [
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
      };
    });

    it.each([
      ['yAccessorLeft', 'above'],
      ['yAccessorLeft', 'below'],
      ['yAccessorRight', 'above'],
      ['yAccessorRight', 'below'],
    ] as Array<[string, ExtendedYConfig['fill']]>)(
      'should render a RectAnnotation for a reference line with fill set: %s %s',
      (layerPrefix, fill) => {
        const wrapper = shallow(
          <ReferenceLineAnnotations
            {...defaultProps}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                lineStyle: 'solid',
                fill,
                axisId: getAxisFromId(layerPrefix),
                type: 'extendedYConfig',
              },
            ])}
          />
        );

        const y0 = fill === 'above' ? 5 : undefined;
        const y1 = fill === 'above' ? undefined : 5;

        expect(wrapper.find(LineAnnotation).exists()).toBe(true);
        expect(wrapper.find(RectAnnotation).exists()).toBe(true);
        expect(wrapper.find(RectAnnotation).prop('dataValues')).toEqual(
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
    ] as Array<[string, ExtendedYConfig['fill']]>)(
      'should render a RectAnnotation for a reference line with fill set: %s %s',
      (layerPrefix, fill) => {
        const wrapper = shallow(
          <ReferenceLineAnnotations
            {...defaultProps}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                lineStyle: 'solid',
                type: 'extendedYConfig',
                fill,
                axisId: 'bottom',
              },
            ])}
          />
        );

        const x0 = fill === 'above' ? 1 : undefined;
        const x1 = fill === 'above' ? undefined : 1;

        expect(wrapper.find(LineAnnotation).exists()).toBe(true);
        expect(wrapper.find(RectAnnotation).exists()).toBe(true);
        expect(wrapper.find(RectAnnotation).prop('dataValues')).toEqual(
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
    ] as Array<[string, ExtendedYConfig['fill'], YCoords, YCoords]>)(
      'should avoid overlap between two reference lines with fill in the same direction: 2 x %s %s',
      (layerPrefix, fill, coordsA, coordsB) => {
        const wrapper = shallow(
          <ReferenceLineAnnotations
            {...defaultProps}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                lineStyle: 'solid',
                type: 'extendedYConfig',
                fill,
                axisId: getAxisFromId(layerPrefix),
              },
              {
                forAccessor: `${layerPrefix}SecondId`,
                lineStyle: 'solid',
                type: 'extendedYConfig',
                fill,
                axisId: getAxisFromId(layerPrefix),
              },
            ])}
          />
        );

        expect(wrapper.find(RectAnnotation).first().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsA },
              details: coordsA.y0 ?? coordsA.y1,
              header: undefined,
            },
          ])
        );
        expect(wrapper.find(RectAnnotation).last().prop('dataValues')).toEqual(
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
    ] as Array<[string, ExtendedYConfig['fill'], XCoords, XCoords]>)(
      'should avoid overlap between two reference lines with fill in the same direction: 2 x %s %s',
      (layerPrefix, fill, coordsA, coordsB) => {
        const wrapper = shallow(
          <ReferenceLineAnnotations
            {...defaultProps}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                lineStyle: 'solid',
                type: 'extendedYConfig',
                fill,
                axisId: 'bottom',
              },
              {
                forAccessor: `${layerPrefix}SecondId`,
                lineStyle: 'solid',
                type: 'extendedYConfig',
                fill,
                axisId: 'bottom',
              },
            ])}
          />
        );

        expect(wrapper.find(RectAnnotation).first().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsA },
              details: coordsA.x0 ?? coordsA.x1,
              header: undefined,
            },
          ])
        );
        expect(wrapper.find(RectAnnotation).last().prop('dataValues')).toEqual(
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
        const axisMode = getAxisFromId(layerPrefix);

        const wrapper = shallow(
          <ReferenceLineAnnotations
            {...defaultProps}
            layers={createLayers([
              {
                forAccessor: `${layerPrefix}FirstId`,
                lineStyle: 'solid',
                fill: 'above',
                axisId: axisMode,
                type: 'extendedYConfig',
              },
              {
                forAccessor: `${layerPrefix}SecondId`,
                lineStyle: 'solid',
                fill: 'below',
                axisId: axisMode,
                type: 'extendedYConfig',
              },
            ])}
          />
        );

        expect(wrapper.find(RectAnnotation).first().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...(axisMode === 'bottom' ? { x0: 1 } : { y0: 5 }) },
              details: axisMode === 'bottom' ? 1 : 5,
              header: undefined,
            },
          ])
        );
        expect(wrapper.find(RectAnnotation).last().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...(axisMode === 'bottom' ? { x1: 2 } : { y1: 10 }) },
              details: axisMode === 'bottom' ? 2 : 10,
              header: undefined,
            },
          ])
        );
      }
    );

    it.each([
      ['above', { y0: 5, y1: 10 }, { y0: 10, y1: undefined }],
      ['below', { y0: undefined, y1: 5 }, { y0: 5, y1: 10 }],
    ] as Array<[ExtendedYConfig['fill'], YCoords, YCoords]>)(
      'should be robust and works also for different axes when on same direction: 1x Left + 1x Right both %s',
      (fill, coordsA, coordsB) => {
        const wrapper = shallow(
          <ReferenceLineAnnotations
            {...defaultProps}
            layers={createLayers([
              {
                forAccessor: `yAccessorLeftFirstId`,
                lineStyle: 'solid',
                fill,
                axisId: 'left',
                type: 'extendedYConfig',
              },
              {
                forAccessor: `yAccessorRightSecondId`,
                lineStyle: 'solid',
                fill,
                axisId: 'right',
                type: 'extendedYConfig',
              },
            ])}
          />
        );

        expect(wrapper.find(RectAnnotation).first().prop('dataValues')).toEqual(
          expect.arrayContaining([
            {
              coordinates: { ...emptyCoords, ...coordsA },
              details: coordsA.y0 ?? coordsA.y1,
              header: undefined,
            },
          ])
        );
        expect(wrapper.find(RectAnnotation).last().prop('dataValues')).toEqual(
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
  });
});

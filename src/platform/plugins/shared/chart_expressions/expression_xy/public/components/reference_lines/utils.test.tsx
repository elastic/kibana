/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AxisTypeId, computeInputCombinations, PosType } from './_mocks';
import { computeChartMargins, getLineAnnotationProps } from './utils';
import { AxesMap, AxisConfiguration, Marker, MarkerBody } from '../../helpers';
import { ReferenceLineAnnotationConfig } from './reference_line_annotations';
import { Position } from '@elastic/charts';
import React from 'react';

describe('reference lines helpers', () => {
  describe('computeChartMargins', () => {
    test.each(computeInputCombinations())(
      '$id test',
      // @ts-expect-error types are not inferred correctly
      ({
        referencePadding,
        labels,
        titles,
        axesMap,
        isHorizontal,
        result,
      }: {
        referencePadding: Partial<Record<PosType, number>>;
        labels: Partial<Record<AxisTypeId, boolean>>;
        titles: Partial<Record<AxisTypeId, boolean>>;
        axesMap: Record<PosType, AxisConfiguration | undefined>;
        isHorizontal: boolean;
        result: Partial<Record<PosType, number>>;
      }) => {
        expect(
          computeChartMargins(referencePadding, labels, titles, axesMap, isHorizontal)
        ).toEqual(result);
      }
    );
  });

  describe('getLineAnnotationProps', () => {
    function getAxesMap({ left, right }: Partial<AxesMap> = {}): AxesMap {
      return {
        left: { groupId: 'yLeft', position: Position.Left, series: [], ...left },
        right: { groupId: 'yRight', position: Position.Right, series: [], ...right },
      };
    }
    function getConfig(
      customPartialConfig: Partial<ReferenceLineAnnotationConfig> = {}
    ): ReferenceLineAnnotationConfig {
      return {
        id: 'id',
        value: 3,
        lineWidth: 5,
        textVisibility: false,
        iconPosition: 'auto',
        axisGroup: getAxesMap().left,
        ...customPartialConfig,
      };
    }

    it('should render only the line with no marker', () => {
      const config = getConfig();
      expect(getLineAnnotationProps(config, 'myLabel', getAxesMap(), false, false)).toEqual(
        expect.objectContaining({
          groupId: 'yLeft',
          markerPosition: Position.Left,
          marker: (
            <Marker
              config={config}
              label={'myLabel'}
              isHorizontal={false}
              hasReducedPadding={false}
            />
          ),
          markerBody: <MarkerBody label={undefined} isHorizontal={false} />,
        })
      );
    });
    it('should render an icon marker', () => {
      const config = getConfig({ icon: 'triangle' });
      expect(getLineAnnotationProps(config, 'myLabel', getAxesMap(), false, false)).toEqual(
        expect.objectContaining({
          groupId: 'yLeft',
          markerPosition: Position.Left,
          marker: (
            <Marker
              config={config}
              label={'myLabel'}
              isHorizontal={false}
              hasReducedPadding={false}
            />
          ),
          markerBody: <MarkerBody label={undefined} isHorizontal={false} />,
        })
      );
    });
    it('should render only the label', () => {
      const config = getConfig({ textVisibility: true });
      expect(getLineAnnotationProps(config, 'myLabel', getAxesMap(), false, true)).toEqual(
        expect.objectContaining({
          groupId: 'yLeft',
          markerPosition: Position.Left,
          marker: (
            <Marker
              config={config}
              label={'myLabel'}
              isHorizontal={false}
              hasReducedPadding={true}
            />
          ),
          markerBody: <MarkerBody label={undefined} isHorizontal={false} />,
        })
      );
    });
    it('should render both icon and text', () => {
      const config = getConfig({ icon: 'triangle', textVisibility: true });
      expect(getLineAnnotationProps(config, 'myLabel', getAxesMap(), false, false)).toEqual(
        expect.objectContaining({
          groupId: 'yLeft',
          markerPosition: Position.Left,
          marker: (
            <Marker
              config={config}
              label={'myLabel'}
              isHorizontal={false}
              hasReducedPadding={false}
            />
          ),
          markerBody: <MarkerBody label={'myLabel'} isHorizontal={false} />,
        })
      );
    });

    it('should handle marker rotated label', () => {
      const config = getConfig({
        icon: 'triangle',
        textVisibility: true,
        axisGroup: { groupId: 'x', position: Position.Bottom, series: [] },
      });
      expect(getLineAnnotationProps(config, 'myLabel', getAxesMap(), false, false)).toEqual(
        expect.objectContaining({
          groupId: 'x',
          markerPosition: Position.Top,
          marker: (
            <Marker
              config={config}
              label={'myLabel'}
              isHorizontal={true}
              hasReducedPadding={false}
            />
          ),
          markerBody: <MarkerBody label={'myLabel'} isHorizontal={true} />,
        })
      );
    });
  });
});

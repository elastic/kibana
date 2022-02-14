/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef } from 'react';

import { brush, brushSelection, brushX } from 'd3-brush';
import type { BrushBehavior } from 'd3-brush';
import { scaleLinear } from 'd3-scale';
// Import fix to apply correct types for the use of d3.select(this).transition()
import { select as d3Select, BaseType } from 'd3-selection';
import { transition as d3Transition } from 'd3-transition';
d3Select.prototype.transition = d3Transition;

import type { WindowParameters } from './get_window_parameters';

import './brush.scss';

const d3 = {
  brush,
  brushSelection,
  brushX,
  scaleLinear,
  select: d3Select,
  transition: d3Transition,
};

const isBrushXSelection = (arg: unknown): arg is [number, number] => {
  return (
    Array.isArray(arg) &&
    arg.length === 2 &&
    typeof arg[0] === 'number' &&
    typeof arg[1] === 'number'
  );
};

interface MlBrush {
  id: string;
  brush: BrushBehavior<MlBrush>;
  start: number;
  end: number;
}

const BRUSH_HEIGHT = 20;
const BRUSH_MARGIN = 4;
const BRUSH_HANDLE_SIZE = 4;
const BRUSH_HANDLE_ROUNDED_CORNER = 2;

export function MlBrush({
  windowParameters,
  min,
  max,
  onChange,
  marginLeft,
  width,
}: {
  windowParameters: WindowParameters;
  min: number;
  max: number;
  onChange?: (windowParameters: WindowParameters) => void;
  marginLeft: number;
  width: number;
}) {
  const d3BrushContainer = useRef(null);
  const brushes = useRef<MlBrush[]>([]);
  const widthRef = useRef(width);

  const { baselineMin, baselineMax, deviationMin, deviationMax } = windowParameters;

  useEffect(() => {
    if (d3BrushContainer.current && width > 0) {
      const gBrushes = d3.select(d3BrushContainer.current);

      function newBrush(id: string, start: number, end: number) {
        brushes.current.push({
          id,
          brush: d3.brushX<MlBrush>().handleSize(BRUSH_HANDLE_SIZE).on('end', brushend),
          start,
          end,
        });

        function brushend(this: BaseType) {
          const currentWidth = widthRef.current;

          const x = d3.scaleLinear().domain([min, max]).rangeRound([0, currentWidth]);

          const px2ts = (px: number) => Math.round(x.invert(px));
          const minExtentPx = Math.round((x(max) - x(min)) / 100);

          const baselineBrush = d3.select('#brush-baseline');
          const baselineSelection = d3.brushSelection(baselineBrush.node() as SVGGElement);

          const deviationBrush = d3.select('#brush-deviation');
          const deviationSelection = d3.brushSelection(deviationBrush.node() as SVGGElement);

          if (!isBrushXSelection(deviationSelection) || !isBrushXSelection(baselineSelection)) {
            return;
          }

          const baselineOverlay = baselineBrush.selectAll('.overlay');
          const deviationOverlay = deviationBrush.selectAll('.overlay');

          let baselineWidth;
          let deviationWidth;
          baselineOverlay.each((d, i, n) => {
            baselineWidth = d3.select(n[i]).attr('width');
          });
          deviationOverlay.each((d, i, n) => {
            deviationWidth = d3.select(n[i]).attr('width');
          });

          if (baselineWidth !== deviationWidth) {
            return;
          }

          const newWindowParameters = {
            baselineMin: px2ts(baselineSelection[0]),
            baselineMax: px2ts(baselineSelection[1]),
            deviationMin: px2ts(deviationSelection[0]),
            deviationMax: px2ts(deviationSelection[1]),
          };

          if (
            id === 'deviation' &&
            deviationSelection &&
            baselineSelection &&
            deviationSelection[0] - minExtentPx < baselineSelection[1]
          ) {
            const newDeviationMin = baselineSelection[1] + minExtentPx;
            const newDeviationMax = Math.max(deviationSelection[1], newDeviationMin + minExtentPx);

            newWindowParameters.deviationMin = px2ts(newDeviationMin);
            newWindowParameters.deviationMax = px2ts(newDeviationMax);

            d3.select(this)
              .transition()
              .duration(200)
              // @ts-expect-error call doesn't allow the brush move function
              .call(brushes.current[1].brush.move, [newDeviationMin, newDeviationMax]);
          } else if (
            id === 'baseline' &&
            deviationSelection &&
            baselineSelection &&
            deviationSelection[0] < baselineSelection[1] + minExtentPx
          ) {
            const newBaselineMax = deviationSelection[0] - minExtentPx;
            const newBaselineMin = Math.min(baselineSelection[0], newBaselineMax - minExtentPx);

            newWindowParameters.baselineMin = px2ts(newBaselineMin);
            newWindowParameters.baselineMax = px2ts(newBaselineMax);

            d3.select(this)
              .transition()
              .duration(200)
              // @ts-expect-error call doesn't allow the brush move function
              .call(brushes.current[0].brush.move, [newBaselineMin, newBaselineMax]);
          }

          brushes.current[0].start = newWindowParameters.baselineMin;
          brushes.current[0].end = newWindowParameters.baselineMax;
          brushes.current[1].start = newWindowParameters.deviationMin;
          brushes.current[1].end = newWindowParameters.deviationMax;

          if (onChange) {
            onChange(newWindowParameters);
          }
          drawBrushes();
        }
      }

      function drawBrushes() {
        const mlBrushSelection = gBrushes
          .selectAll('.brush')
          .data<MlBrush>(brushes.current, (d) => (d as MlBrush).id);

        // Set up new brushes
        mlBrushSelection
          .enter()
          .insert('g', '.brush')
          .attr('class', 'brush')
          .attr('id', (b: MlBrush) => {
            return 'brush-' + b.id;
          })
          .each((brushObject: MlBrush, i, n) => {
            const x = d3.scaleLinear().domain([min, max]).rangeRound([0, widthRef.current]);
            brushObject.brush(d3.select(n[i]));
            brushObject.brush.move(d3.select(n[i]), [x(brushObject.start), x(brushObject.end)]);
          });

        // disable drag-select to reset a brush's selection
        mlBrushSelection
          .attr('class', 'brush')
          .selectAll('.overlay')
          .attr('width', width)
          .style('pointer-events', 'none');

        mlBrushSelection
          .selectAll('.handle')
          .attr('rx', BRUSH_HANDLE_ROUNDED_CORNER)
          .attr('ry', BRUSH_HANDLE_ROUNDED_CORNER);

        mlBrushSelection.exit().remove();
      }

      function updateBrushes() {
        const mlBrushSelection = gBrushes
          .selectAll('.brush')
          .data<MlBrush>(brushes.current, (d) => (d as MlBrush).id);

        mlBrushSelection.each(function (brushObject, i, n) {
          const x = d3.scaleLinear().domain([min, max]).rangeRound([0, widthRef.current]);
          brushObject.brush.extent([
            [0, BRUSH_MARGIN],
            [width, BRUSH_HEIGHT - BRUSH_MARGIN],
          ]);
          brushObject.brush(d3.select(n[i] as SVGGElement));
          brushObject.brush.move(d3.select(n[i] as SVGGElement), [
            x(brushObject.start),
            x(brushObject.end),
          ]);
        });
      }

      if (brushes.current.length !== 2) {
        widthRef.current = width;
        newBrush('baseline', baselineMin, baselineMax);
        newBrush('deviation', deviationMin, deviationMax);
      } else {
        if (widthRef.current !== width) {
          widthRef.current = width;
          updateBrushes();
        }
      }

      drawBrushes();
    }
  }, [min, max, width, baselineMin, baselineMax, deviationMin, deviationMax, onChange]);

  return (
    <>
      {width > 0 && (
        <svg className="ml-d3-component" width={width} height={BRUSH_HEIGHT} style={{ marginLeft }}>
          <g className="brushes" width={width} ref={d3BrushContainer} />
        </svg>
      )}
    </>
  );
}

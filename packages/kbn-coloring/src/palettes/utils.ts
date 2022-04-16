/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PaletteContinuity,
  PaletteRegistry,
  CustomPaletteParams,
  DataBounds,
  ColorStop,
} from './types';

import {
  DEFAULT_COLOR_STEPS,
  DEFAULT_PALETTE_NAME,
  DEFAULT_MAX_STOP,
  DEFAULT_MIN_STOP,
} from './constants';

/** @internal **/
export function calculateStop(
  stopValue: number,
  newMin: number,
  oldMin: number,
  oldInterval: number,
  newInterval: number
) {
  if (oldInterval === 0) {
    return newInterval + newMin;
  }
  return roundValue(newMin + ((stopValue - oldMin) * newInterval) / oldInterval);
}

/**
 * This is a generic function to compute stops from the current parameters.
 */
export function getPaletteStops(
  palettes: PaletteRegistry,
  activePaletteParams: CustomPaletteParams,
  // used to customize color resolution
  {
    prevPalette,
    dataBounds,
    mapFromMinValue,
    defaultPaletteName,
  }: {
    prevPalette?: string;
    dataBounds: DataBounds;
    mapFromMinValue?: boolean;
    defaultPaletteName?: string;
  }
) {
  const { min: minValue, max: maxValue } = getOverallMinMax(activePaletteParams, dataBounds);
  const interval = maxValue - minValue;
  const { stops: currentStops, ...otherParams } = activePaletteParams || {};

  if (activePaletteParams.name === 'custom' && activePaletteParams?.colorStops) {
    // need to generate the palette from the existing controlStops
    return shiftPalette(activePaletteParams.colorStops, maxValue);
  }

  const steps = activePaletteParams?.steps || DEFAULT_COLOR_STEPS;
  // generate a palette from predefined ones and customize the domain
  const colorStopsFromPredefined = palettes
    .get(prevPalette || activePaletteParams?.name || defaultPaletteName || DEFAULT_PALETTE_NAME)
    .getCategoricalColors(steps, otherParams);

  const newStopsMin = mapFromMinValue || interval === 0 ? minValue : interval / steps;

  return remapStopsByNewInterval(
    colorStopsFromPredefined.map((color, index) => ({ color, stop: index })),
    {
      newInterval: interval,
      oldInterval: colorStopsFromPredefined.length,
      newMin: newStopsMin,
      oldMin: 0,
    }
  );
}

// Utility to remap color stops within new domain
export function remapStopsByNewInterval(
  controlStops: ColorStop[],
  {
    newInterval,
    oldInterval,
    newMin,
    oldMin,
  }: { newInterval: number; oldInterval: number; newMin: number; oldMin: number }
) {
  return (controlStops || []).map(({ color, stop }) => {
    return {
      color,
      stop: calculateStop(stop, newMin, oldMin, oldInterval, newInterval),
    };
  });
}

// Need to shift the Custom palette in order to correctly visualize it when in display mode
export function shiftPalette(stops: ColorStop[], max: number) {
  // shift everything right and add an additional stop at the end
  const result = stops.map((entry, i, array) => ({
    ...entry,
    stop: i + 1 < array.length ? array[i + 1].stop : max,
  }));

  if (stops[stops.length - 1].stop === max) {
    // extends the range by a fair amount to make it work the extra case for the last stop === max
    const computedStep = getStepValue(stops, result, max) || 1;
    // do not go beyond the unit step in this case
    const step = Math.min(1, computedStep);
    result[stops.length - 1].stop = max + step;
  }
  return result;
}

function getOverallMinMax(params: CustomPaletteParams | undefined, dataBounds: DataBounds) {
  const { min: dataMin, max: dataMax } = getDataMinMax(params?.rangeType, dataBounds);
  const minStopValue = params?.colorStops?.[0]?.stop ?? Number.POSITIVE_INFINITY;
  const maxStopValue =
    params?.colorStops?.[params.colorStops.length - 1]?.stop ?? Number.NEGATIVE_INFINITY;
  const overallMin = Math.min(dataMin, minStopValue);
  const overallMax = Math.max(dataMax, maxStopValue);
  return { min: overallMin, max: overallMax };
}

export function roundValue(value: number, fractionDigits: number = 2) {
  return Number((Math.floor(value * 100) / 100).toFixed(fractionDigits));
}

// very simple heuristic: pick last two stops and compute a new stop based on the same distance
// if the new stop is above max, then reduce the step to reach max, or if zero then just 1.
//
// it accepts two series of stops as the function is used also when computing stops from colorStops
export function getStepValue(colorStops: ColorStop[], newColorStops: ColorStop[], max: number) {
  const length = newColorStops.length;
  // workout the steps from the last 2 items
  const dataStep =
    length > 1 ? newColorStops[length - 1].stop - newColorStops[length - 2].stop || 1 : 1;
  let step = Number(dataStep.toFixed(2));
  if (max < colorStops[length - 1].stop + step) {
    const diffToMax = max - colorStops[length - 1].stop;
    // if the computed step goes way out of bound, fallback to 1, otherwise reach max
    step = diffToMax > 0 ? diffToMax : 1;
  }
  return step;
}

export function getDataMinMax(
  rangeType: CustomPaletteParams['rangeType'] | undefined,
  dataBounds: DataBounds
) {
  const dataMin = rangeType === 'number' ? dataBounds.min : DEFAULT_MIN_STOP;
  const dataMax = rangeType === 'number' ? dataBounds.max : DEFAULT_MAX_STOP;
  return { min: dataMin, max: dataMax };
}

export const checkIsMinContinuity = (continuity: PaletteContinuity | undefined) =>
  Boolean(continuity && ['below', 'all'].includes(continuity));

export const checkIsMaxContinuity = (continuity: PaletteContinuity | undefined) =>
  Boolean(continuity && ['above', 'all'].includes(continuity));

export const getFallbackDataBounds = (
  rangeType: CustomPaletteParams['rangeType'] = 'percent'
): DataBounds =>
  rangeType === 'percent'
    ? {
        min: 0,
        max: 100,
        fallback: true,
      }
    : {
        min: 1,
        max: 1,
        fallback: true,
      };

export function reversePalette(paletteColorRepresentation: ColorStop[] = []) {
  const stops = paletteColorRepresentation.map(({ stop }) => stop);
  return paletteColorRepresentation
    .map(({ color }, i) => ({
      color,
      stop: stops[paletteColorRepresentation.length - i - 1],
    }))
    .reverse();
}

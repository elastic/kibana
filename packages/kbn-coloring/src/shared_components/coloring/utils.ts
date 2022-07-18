/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chroma from 'chroma-js';

import {
  DataBounds,
  PaletteOutput,
  PaletteRegistry,
  checkIsMinContinuity,
  reversePalette,
  checkIsMaxContinuity,
  calculateStop,
  roundValue,
  getPaletteStops,
  getDataMinMax,
  CustomPaletteParams,
  CUSTOM_PALETTE,
  DEFAULT_RANGE_TYPE,
  DEFAULT_COLOR_STEPS,
  DEFAULT_CONTINUITY,
} from '../../palettes';

import type { ColorRange } from './color_ranges';
import { toColorStops, sortColorRanges } from './color_ranges/utils';
import type { PaletteConfigurationState } from './types';

/**
 * Some name conventions here:
 * * `displayStops` => It's an additional transformation of `stops` into a [0, N] domain for the EUIPaletteDisplay component.
 * * `stops` => final steps used to table coloring. It is a rightShift of the colorStops
 * * `colorStops` => user's color stop inputs.  Used to compute range min.
 *
 * When the user inputs the colorStops, they are designed to be the initial part of the color segment,
 * so the next stops indicate where the previous stop ends.
 * Both table coloring logic and EuiPaletteDisplay format implementation works differently than our current `colorStops`,
 * by having the stop values at the end of each color segment rather than at the beginning: `stops` values are computed by a rightShift of `colorStops`.
 * EuiPaletteDisplay has an additional requirement as it is always mapped against a domain [0, N]: from `stops` the `displayStops` are computed with
 * some continuity enrichment and a remap against a [0, 100] domain to make the palette component work ok.
 *
 * These naming conventions would be useful to track the code flow in this feature as multiple transformations are happening
 * for a single change.
 */

export function updateRangeType(
  newRangeType: CustomPaletteParams['rangeType'],
  activePalette: PaletteConfigurationState['activePalette'],
  dataBounds: DataBounds,
  palettes: PaletteRegistry,
  colorRanges: PaletteConfigurationState['colorRanges']
) {
  const continuity = activePalette.params?.continuity ?? DEFAULT_CONTINUITY;
  const params: CustomPaletteParams = { rangeType: newRangeType };
  const { min: newMin, max: newMax } = getDataMinMax(newRangeType, dataBounds);
  const { min: oldMin, max: oldMax } = getDataMinMax(activePalette.params?.rangeType, dataBounds);
  const newColorStops = getStopsFromColorRangesByNewInterval(colorRanges, {
    oldInterval: oldMax - oldMin,
    newInterval: newMax - newMin,
    newMin,
    oldMin,
  });

  if (activePalette.name === CUSTOM_PALETTE) {
    const stops = getPaletteStops(
      palettes,
      { ...activePalette.params, colorStops: newColorStops, ...params },
      { dataBounds }
    );
    params.colorStops = newColorStops;
    params.stops = stops;
  } else {
    params.stops = getPaletteStops(
      palettes,
      { ...activePalette.params, ...params },
      { prevPalette: activePalette.name, dataBounds }
    );
  }

  const lastStop =
    activePalette.name === CUSTOM_PALETTE
      ? newColorStops[newColorStops.length - 1].stop
      : params.stops[params.stops.length - 1].stop;

  params.rangeMin = checkIsMinContinuity(continuity)
    ? Number.NEGATIVE_INFINITY
    : activePalette.name === CUSTOM_PALETTE
    ? newColorStops[0].stop
    : params.stops[0].stop;

  params.rangeMax = checkIsMaxContinuity(continuity)
    ? Number.POSITIVE_INFINITY
    : activePalette.params?.rangeMax
    ? calculateStop(activePalette.params.rangeMax, newMin, oldMin, oldMax - oldMin, newMax - newMin)
    : lastStop > newMax
    ? lastStop + 1
    : newMax;

  return params;
}

export function changeColorPalette(
  newPalette: PaletteConfigurationState['activePalette'],
  activePalette: PaletteConfigurationState['activePalette'],
  palettes: PaletteRegistry,
  dataBounds: DataBounds,
  disableSwitchingContinuity: boolean
) {
  const isNewPaletteCustom = newPalette.name === CUSTOM_PALETTE;
  const newParams: CustomPaletteParams = {
    ...activePalette.params,
    name: newPalette.name,
    colorStops: undefined,
    continuity: disableSwitchingContinuity
      ? activePalette.params?.continuity ?? DEFAULT_CONTINUITY
      : DEFAULT_CONTINUITY,
    reverse: false, // restore the reverse flag
  };

  // we should pass colorStops so that correct calculate new color stops (if there was before) for custom palette
  const newColorStops = getColorStops(
    palettes,
    activePalette.params?.colorStops || [],
    activePalette,
    dataBounds
  );

  if (isNewPaletteCustom) {
    newParams.colorStops = newColorStops;
  }

  return {
    ...newPalette,
    params: {
      ...newParams,
      stops: getPaletteStops(palettes, newParams, {
        prevPalette:
          isNewPaletteCustom || activePalette.name === CUSTOM_PALETTE ? undefined : newPalette.name,
        dataBounds,
        mapFromMinValue: true,
      }),
      rangeMin: checkIsMinContinuity(newParams.continuity)
        ? Number.NEGATIVE_INFINITY
        : Math.min(dataBounds.min, newColorStops[0].stop),
      rangeMax: checkIsMaxContinuity(newParams.continuity)
        ? Number.POSITIVE_INFINITY
        : Math.min(dataBounds.max, newColorStops[newColorStops.length - 1].stop),
    },
  };
}

export function withUpdatingPalette(
  palettes: PaletteRegistry,
  activePalette: PaletteConfigurationState['activePalette'],
  colorRanges: ColorRange[],
  dataBounds: DataBounds,
  continuity?: CustomPaletteParams['continuity']
) {
  const currentContinuity = continuity ?? activePalette.params?.continuity ?? DEFAULT_CONTINUITY;
  let sortedColorRanges = colorRanges;
  if (
    colorRanges.some((value, index) =>
      index !== colorRanges.length - 1 ? value.start > colorRanges[index + 1].start : false
    )
  ) {
    sortedColorRanges = sortColorRanges(colorRanges);
  }

  const { max, colorStops } = toColorStops(sortedColorRanges, currentContinuity);

  const newPallete = getSwitchToCustomParams(
    palettes,
    activePalette!,
    {
      continuity: currentContinuity,
      colorStops,
      steps: activePalette!.params?.steps || DEFAULT_COLOR_STEPS,
      reverse: activePalette!.params?.reverse,
      rangeMin: colorStops[0]?.stop,
      rangeMax: max,
    },
    dataBounds!
  );

  return {
    activePalette: newPallete,
    colorRanges,
  };
}

export function withUpdatingColorRanges(
  palettes: PaletteRegistry,
  activePalette: PaletteConfigurationState['activePalette'],
  dataBounds: DataBounds
) {
  return {
    colorRanges: toColorRanges(
      palettes,
      activePalette.params?.colorStops || [],
      activePalette,
      dataBounds
    ),
    activePalette,
  };
}

// Utility to remap color stops within new domain
export function getStopsFromColorRangesByNewInterval(
  colorRanges: ColorRange[],
  {
    newInterval,
    oldInterval,
    newMin,
    oldMin,
  }: { newInterval: number; oldInterval: number; newMin: number; oldMin: number }
) {
  return (colorRanges || []).map(({ color, start }) => {
    let stop = calculateStop(start, newMin, oldMin, oldInterval, newInterval);

    if (oldInterval === 0) {
      stop = newInterval + newMin;
    }

    return {
      color,
      stop: roundValue(stop),
    };
  });
}

export function mergePaletteParams(
  activePalette: PaletteOutput<CustomPaletteParams>,
  newParams: CustomPaletteParams
): PaletteOutput<CustomPaletteParams> {
  return {
    ...activePalette,
    params: {
      ...activePalette.params,
      ...newParams,
    },
  };
}

function isValidPonyfill(colorString: string) {
  // we're using an old version of chroma without the valid function
  try {
    chroma(colorString);
    return true;
  } catch (e) {
    return false;
  }
}

export function isValidColor(colorString: string) {
  // chroma can handle also hex values with alpha channel/transparency
  // chroma accepts also hex without #, so test for it
  return colorString !== '' && /^#/.test(colorString) && isValidPonyfill(colorString);
}

function getSwitchToCustomParams(
  palettes: PaletteRegistry,
  activePalette: PaletteOutput<CustomPaletteParams>,
  newParams: CustomPaletteParams,
  dataBounds: DataBounds
) {
  // if it's already a custom palette just return the params
  if (activePalette?.params?.name === CUSTOM_PALETTE) {
    const stops = getPaletteStops(
      palettes,
      {
        steps: DEFAULT_COLOR_STEPS,
        ...activePalette.params,
        ...newParams,
      },
      {
        dataBounds,
      }
    );
    return mergePaletteParams(activePalette, {
      ...newParams,
      stops,
    });
  }
  // prepare everything to switch to custom palette
  const newPaletteParams = {
    steps: DEFAULT_COLOR_STEPS,
    ...activePalette.params,
    ...newParams,
    name: CUSTOM_PALETTE,
  };

  const stops = getPaletteStops(palettes, newPaletteParams, {
    prevPalette: newPaletteParams.colorStops ? undefined : activePalette.name,
    dataBounds,
  });
  return mergePaletteParams(
    { name: CUSTOM_PALETTE, type: 'palette' },
    {
      ...newPaletteParams,
      stops,
    }
  );
}

export function getColorStops(
  palettes: PaletteRegistry,
  colorStops: Required<CustomPaletteParams>['stops'],
  activePalette: PaletteOutput<CustomPaletteParams>,
  dataBounds: DataBounds
) {
  // just forward the current stops if custom
  if (activePalette?.name === CUSTOM_PALETTE && colorStops?.length) {
    return colorStops;
  }
  // for predefined palettes create some stops, then drop the last one.
  // we're using these as starting point for the user
  let freshColorStops = getPaletteStops(
    palettes,
    { ...activePalette?.params },
    // mapFromMinValue is a special flag to offset the stops values
    // used here to avoid a new remap/left shift
    { dataBounds, mapFromMinValue: true, defaultPaletteName: activePalette.name }
  );
  if (activePalette?.params?.reverse) {
    freshColorStops = reversePalette(freshColorStops);
  }
  return freshColorStops;
}

/**
 * Both table coloring logic and EuiPaletteDisplay format implementation works differently than our current `colorStops`,
 * by having the stop values at the end of each color segment rather than at the beginning: `stops` values are computed by a rightShift of `colorStops`.
 * EuiPaletteDisplay has an additional requirement as it is always mapped against a domain [0, N]: from `stops` the `displayStops` are computed with
 * some continuity enrichment and a remap against a [0, 100] domain to make the palette component work ok.
 *
 * These naming conventions would be useful to track the code flow in this feature as multiple transformations are happening
 * for a single change.
 */
export function toColorRanges(
  palettes: PaletteRegistry,
  colorStops: CustomPaletteParams['colorStops'],
  activePalette: PaletteOutput<CustomPaletteParams>,
  dataBounds: DataBounds
) {
  const { continuity = DEFAULT_CONTINUITY, rangeType = DEFAULT_RANGE_TYPE } =
    activePalette.params ?? {};
  const { min: dataMin, max: dataMax } = getDataMinMax(rangeType, dataBounds);

  return getColorStops(palettes, colorStops || [], activePalette, dataBounds).map(
    (colorStop, index, array) => {
      const isFirst = index === 0;
      const isLast = index === array.length - 1;

      return {
        color: colorStop.color,
        start:
          isFirst && checkIsMinContinuity(continuity)
            ? Number.NEGATIVE_INFINITY
            : colorStop.stop ?? activePalette.params?.rangeMin ?? dataMin,
        end:
          isLast && checkIsMaxContinuity(continuity)
            ? Number.POSITIVE_INFINITY
            : array[index + 1]?.stop ?? activePalette.params?.rangeMax ?? dataMax,
      };
    }
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ColorMapping, ColorStop, CustomPaletteParams, PaletteOutput } from '@kbn/coloring';

import type { GradientColorMode } from '@kbn/coloring/src/shared_components/color_mapping/config/types';
import type {
  AllColoringTypes,
  ColorByValueAbsolute,
  ColorByValueStep,
  ColorByValueType,
  ColorMappingColorDefType,
  ColorMappingType,
  StaticColorType,
} from '../../schema/color';
import type { SerializableValueType } from '../../schema/serializedValue';

const LENS_DEFAULT_COLOR_BY_VALUE_RANGE_TYPE = 'percentage';
const LENS_DEFAULT_COLOR_MAPPING_PALETTE = 'default';

const LEGACY_TO_API_RANGE_NAMES: Record<'percent' | 'number', 'percentage' | 'absolute'> = {
  number: 'absolute',
  percent: 'percentage',
};

const API_TO_LEGACY_RANGE_NAMES: Record<'percentage' | 'absolute', 'percent' | 'number'> = {
  absolute: 'number',
  percentage: 'percent',
};

export const LEGACY_PALETTE_PREFIX = 'LEGACY_PALETTE_';

export function isLegacyColorPalette(
  color: { colorMapping: ColorMapping.Config } | { palette: PaletteOutput } | undefined
): color is { palette: PaletteOutput } {
  return 'palette' in (color ?? {});
}

export function fromColorByValueAPIToLensState(
  config?: ColorByValueType
): PaletteOutput<CustomPaletteParams> | undefined {
  if (!config) return;

  const stops = config.steps.map(
    ({ lt, lte, color }): ColorStop => ({
      color,
      // @ts-expect-error - This can be null
      stop: lt ?? lte ?? null,
    })
  );

  const colorStops = config.steps.map(
    ({ gte, color }): ColorStop => ({
      color,
      // @ts-expect-error - This can be null
      stop: gte ?? null,
    })
  );

  const rangeMin = colorStops.at(0)?.stop ?? null;
  const rangeMax = stops.at(-1)?.stop ?? null;

  const isLegacy = config.type === 'legacy-dynamic';
  const name = isLegacy ? config.palette : 'custom';
  const needsPaletteShift = isLegacy && config.shift;

  return {
    type: 'palette',
    name,
    params: {
      name,
      progression: 'fixed', // to be removed
      reverse: false, // always applied to steps during transform
      // @ts-expect-error - This can be null
      rangeMin,
      // @ts-expect-error - This can be null
      rangeMax,
      rangeType: config.range
        ? API_TO_LEGACY_RANGE_NAMES[config.range]
        : API_TO_LEGACY_RANGE_NAMES.absolute,
      stops: !needsPaletteShift
        ? stops
        : stops.map((stop, i) => ({
            ...stop,
            // value can be null
            stop: i === 0 ? (rangeMin as number) : stops[i - 1].stop,
          })),
      // ignore colorStops when shifting palettes stops
      colorStops,
      continuity:
        rangeMin === null && rangeMax === null
          ? 'all'
          : rangeMax === null
          ? 'above'
          : rangeMin === null
          ? 'below'
          : 'none',
      steps: stops.length,
      maxSteps: Math.max(5, stops.length), // TODO: point this to a constant or a common default
    },
  };
}

function getRangeValue(value?: number | null): number | null {
  if (value === undefined || value === null || !isFinite(value)) return null;
  return value;
}

export function fromColorByValueLensStateToAPI(
  config: PaletteOutput<CustomPaletteParams> | undefined
): ColorByValueType | undefined {
  const colorParams = config?.params;

  if (!colorParams) return;

  const { rangeType, reverse } = colorParams;
  let originalStops = colorParams.stops ?? [];

  const palette = colorParams.name ?? 'custom';
  const isLegacy = palette !== 'custom';
  const rangeMin = getRangeValue(colorParams.rangeMin);
  const rangeMax = getRangeValue(colorParams.rangeMax);
  const needsPaletteShift =
    isLegacy &&
    ((rangeMin !== null && rangeMin === originalStops.at(0)?.stop) ||
      (rangeMax !== null && rangeMax !== originalStops.at(-1)?.stop));

  // legacy non-custom color stops are incorrectly configured for bwc and "fixed" in client logic
  // we need to return the incorrect stops to make it work as it does currently.
  // see https://github.com/elastic/kibana/issues/251135
  if (needsPaletteShift) {
    // @ts-expect-error - stop value can be null
    originalStops = originalStops.map((stop, i) => ({
      ...stop,
      stop: i === originalStops.length - 1 ? rangeMax : originalStops[i + 1].stop,
    }));
  }

  const range = rangeType
    ? LEGACY_TO_API_RANGE_NAMES[rangeType]
    : LENS_DEFAULT_COLOR_BY_VALUE_RANGE_TYPE;
  const stops = !reverse
    ? originalStops
    : originalStops
        .slice()
        .reverse()
        .map(({ color }, i) => ({
          ...originalStops[i],
          color,
        }));
  const steps = stops.map((step, i): ColorByValueStep => {
    const { stop: currentStop, color } = step;
    if (i === 0) {
      return {
        ...(rangeMin !== null && { gte: rangeMin }),
        lt: currentStop,
        color,
      };
    }

    const prevStop = stops[i - 1].stop ?? undefined;

    if (i === stops.length - 1) {
      return {
        gte: prevStop,
        // ignores stop value, current logic sets last stop to max domain not user defined rangeMax
        ...(rangeMax !== null && { lte: rangeMax }),
        color,
      };
    }

    return {
      gte: prevStop,
      lt: currentStop,
      color,
    };
  });

  if (isLegacy) {
    return {
      type: 'legacy-dynamic',
      range,
      palette,
      shift: needsPaletteShift,
      steps,
    };
  }

  return {
    type: 'dynamic',
    range,
    steps,
  };
}

export function fromStaticColorLensStateToAPI(
  color: string | undefined
): StaticColorType | undefined {
  if (!color) {
    return;
  }
  return {
    type: 'static',
    color,
  };
}
export function fromStaticColorAPIToLensState(
  color: StaticColorType | undefined
): { color: string } | undefined {
  if (!color) {
    return;
  }
  return { color: color.color };
}

function fromColorLensStateToAPI(
  color: ColorMapping.CategoricalColor | ColorMapping.ColorCode
): ColorMappingColorDefType {
  if (color.type === 'colorCode') {
    return {
      type: 'colorCode',
      value: color.colorCode,
    };
  }
  return {
    type: 'from_palette',
    palette: color.paletteId,
    index: color.colorIndex,
  };
}

function fromRulesLensStateToAPI(rules: ColorMapping.ColorRule[]): SerializableValueType[] {
  return rules
    .filter((rule): rule is Extract<ColorMapping.ColorRule, { type: 'raw' }> => rule.type === 'raw')
    .map((rule) => rule.value as SerializableValueType);
}

function isLensStateCategoricalConfigColorMapping(
  colorMapping: ColorMapping.Config
): colorMapping is ColorMapping.CategoricalConfig {
  return colorMapping.colorMode.type === 'categorical';
}

function fromUnassignedColorLensStateToAPI(
  color: ColorMapping.CategoricalColor | ColorMapping.ColorCode | ColorMapping.LoopColor | undefined
): { unassignedColor: Extract<ColorMappingColorDefType, { type: 'colorCode' }> } | {} {
  if (!color || color.type === 'loop') {
    return {};
  }
  const unassignedColor = fromColorLensStateToAPI(color);
  return { unassignedColor };
}

export function fromColorMappingLensStateToAPI(
  colorMapping: ColorMapping.Config | undefined,
  legacyPalette?: PaletteOutput
): ColorMappingType | undefined {
  if (legacyPalette && !colorMapping) {
    return {
      mode: 'categorical',
      palette: `${LEGACY_PALETTE_PREFIX}${legacyPalette.name}`,
      mapping: [],
    };
  }
  if (!colorMapping) {
    return;
  }

  const unassignedColor = fromUnassignedColorLensStateToAPI(
    colorMapping.specialAssignments[0]?.color
  );
  if (isLensStateCategoricalConfigColorMapping(colorMapping)) {
    return {
      mode: 'categorical',
      palette: colorMapping.paletteId,
      mapping: colorMapping.assignments.map(({ rules, color }) => {
        return {
          values: fromRulesLensStateToAPI(rules),
          color: fromColorLensStateToAPI(color),
        };
      }),
      ...unassignedColor,
    };
  }

  // because of early return above, we know it is a gradient at this point so casting is safe
  const colorMode = colorMapping.colorMode as ColorMapping.GradientColorMode;
  const colorAssignments = colorMapping.assignments;

  return {
    mode: 'gradient',
    palette: colorMapping.paletteId,
    mapping: colorAssignments.map(({ rules }) => {
      return {
        values: fromRulesLensStateToAPI(rules),
      };
    }),
    sort: (colorMapping.colorMode as GradientColorMode).sort ?? 'desc',
    gradient: colorMode.steps.map((color) => fromColorLensStateToAPI(color)),
    ...unassignedColor,
  };
}

function fromColorDefAPIToLensState(
  color: ColorMappingColorDefType
): ColorMapping.CategoricalColor | ColorMapping.ColorCode {
  if (color.type === 'colorCode') {
    return {
      type: 'colorCode',
      colorCode: color.value,
    };
  }
  return {
    type: 'categorical',
    paletteId: color.palette ?? LENS_DEFAULT_COLOR_MAPPING_PALETTE,
    colorIndex: color.index,
  };
}

function fromRulesAPIToLensState(values: SerializableValueType[]): ColorMapping.ColorRule[] {
  return values.map((value): ColorMapping.ColorRule => {
    return {
      type: 'raw',
      value,
    };
  });
}

function isAPICategoricalConfigColorMapping(
  colorMapping: ColorMappingType
): colorMapping is Extract<ColorMappingType, { mode: 'categorical' }> {
  return colorMapping.mode === 'categorical';
}

function fromAPIMappingToAssignments(
  colorMapping: ColorMappingType | undefined
): Array<
  ColorMapping.AssignmentBase<
    ColorMapping.ColorRule,
    ColorMapping.CategoricalColor | ColorMapping.ColorCode | ColorMapping.GradientColor
  >
> {
  if (!colorMapping || !colorMapping.mapping) {
    return [];
  }
  if (isAPICategoricalConfigColorMapping(colorMapping)) {
    return colorMapping.mapping.map((assignment) => {
      return {
        rules: fromRulesAPIToLensState(assignment.values),
        color: fromColorDefAPIToLensState(assignment.color),
        touched: false,
      };
    });
  }
  return colorMapping.mapping.map((assignment, index) => {
    const step = colorMapping.gradient?.[index];
    return {
      rules: fromRulesAPIToLensState(assignment.values),
      color: fromColorDefAPIToLensState(step!),
      touched: false,
    };
  });
}

export function fromColorMappingAPIToLensState(
  colorMapping: ColorMappingType | undefined
): { colorMapping: ColorMapping.Config } | { palette: PaletteOutput } | undefined {
  if (!colorMapping) {
    return;
  }
  if (colorMapping.palette.includes(LEGACY_PALETTE_PREFIX)) {
    return {
      palette: { type: 'palette', name: colorMapping.palette.replace(LEGACY_PALETTE_PREFIX, '') }, // remove the prefix
    };
  }

  const specialAssignments: ColorMapping.SpecialAssignment[] = [
    {
      rules: [
        {
          type: 'other',
        },
      ],
      color: colorMapping.unassignedColor
        ? colorMapping.unassignedColor.type === 'from_palette'
          ? {
              type: 'categorical',
              paletteId: colorMapping.unassignedColor.palette ?? LENS_DEFAULT_COLOR_MAPPING_PALETTE,
              colorIndex: colorMapping.unassignedColor.index,
            }
          : {
              type: 'colorCode',
              colorCode: colorMapping.unassignedColor.value,
            }
        : { type: 'loop' },
      touched: false,
    },
  ];
  const assignments = fromAPIMappingToAssignments(colorMapping);
  const colorMode: ColorMapping.Config['colorMode'] =
    colorMapping.mode !== 'gradient'
      ? { type: colorMapping.mode }
      : {
          type: colorMapping.mode,
          steps: (colorMapping.gradient?.map(fromColorDefAPIToLensState) ?? []).map((step) => ({
            ...step,
            touched: false,
          })),
          sort: colorMapping.sort ?? 'desc',
        };

  return {
    colorMapping: {
      colorMode,
      paletteId: colorMapping.palette,
      assignments,
      specialAssignments,
    },
  };
}

export function isColorByValueColor(color?: AllColoringTypes): color is ColorByValueType {
  if (!color || !('type' in color)) return false;
  return color.type === 'dynamic' || color.type === 'legacy-dynamic';
}

export function isColorByValueAbsolute(color?: AllColoringTypes): color is ColorByValueAbsolute {
  // This is needed because the schema for `absolute` and `percentage` are combined in one
  return isColorByValueColor(color) && color.range === 'absolute';
}

export function isColorMappingColor(color?: AllColoringTypes): color is ColorMappingType {
  if (!color || !('mode' in color)) return false;
  return color.mode === 'categorical' || color.mode === 'gradient';
}

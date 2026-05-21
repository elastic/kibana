/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ColorMapping, ColorStop, CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { KbnPaletteId } from '@kbn/palettes';
import type {
  AllColoringTypes,
  AutoColorType,
  ColorByValueAbsolute,
  ColorByValueStep,
  ColorByValueType,
  ColorMappingCategoricalType,
  ColorMappingColorDefType,
  ColorMappingGradientType,
  ColorMappingType,
  NoColorType,
  StaticColorType,
  UnassignedColorType,
} from '../../schema/color';
export { NO_COLOR, AUTO_COLOR, DEFAULT_CATEGORICAL_COLOR_MAPPING } from '../../schema/color';
import type { SerializableValueType } from '../../schema/serializedValue';
import { getReversibleMappings } from '../charts/utils';

const LENS_DEFAULT_COLOR_BY_VALUE_RANGE_TYPE = 'percentage';
const LENS_DEFAULT_COLOR_MAPPING_PALETTE: KbnPaletteId = 'default';

const paletteRangeCompat = getReversibleMappings([
  ['percentage', 'percent'],
  ['absolute', 'number'],
]);

export const LEGACY_PALETTE_PREFIX = 'LEGACY_PALETTE_';

export function isLegacyColorPalette(
  color: { colorMapping: ColorMapping.Config } | { palette: PaletteOutput } | undefined
): color is { palette: PaletteOutput } {
  return 'palette' in (color ?? {});
}

export function getContinuity(
  rangeMin: number | null,
  rangeMax: number | null
): 'all' | 'above' | 'below' | 'none' {
  return rangeMin === null && rangeMax === null
    ? 'all'
    : rangeMax === null
    ? 'above'
    : rangeMin === null
    ? 'below'
    : 'none';
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

  const isLegacy = config.type === 'legacy_dynamic';
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
      rangeType: paletteRangeCompat.toState(config.range ?? 'absolute'),
      stops: !needsPaletteShift
        ? stops
        : stops.map((stop, i) => ({
            ...stop,
            // value can be null
            stop: i === 0 ? (rangeMin as number) : stops[i - 1].stop,
          })),
      colorStops,
      continuity: getContinuity(rangeMin, rangeMax),
      steps: stops.length,
      maxSteps: Math.max(5, stops.length), // TODO: point this to a constant or a common default
    },
  };
}

export function getRangeValue(value?: number | null): number | null {
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

  const range = paletteRangeCompat.toAPI(rangeType) ?? LENS_DEFAULT_COLOR_BY_VALUE_RANGE_TYPE;
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
      type: 'legacy_dynamic',
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
      type: 'color_code',
      value: color.colorCode,
    };
  }
  return {
    type: 'from_palette',
    palette: color.paletteId,
    index: color.colorIndex,
  };
}

function mapSerializedValueToAPI(value: unknown): SerializableValueType {
  if (value !== null && typeof value === 'object' && 'type' in value) {
    const typed = value as { type: string };
    if (typed.type === 'multiFieldKey') {
      return { ...typed, type: 'multi_field_key' } as SerializableValueType;
    }
    if (typed.type === 'rangeKey') {
      return { ...typed, type: 'range_key' } as SerializableValueType;
    }
  }
  return value as SerializableValueType;
}

function mapSerializedValueFromAPI(value: SerializableValueType): unknown {
  if (value !== null && typeof value === 'object' && 'type' in value) {
    const typed = value as { type: string };
    if (typed.type === 'multi_field_key') {
      return { ...typed, type: 'multiFieldKey' };
    }
    if (typed.type === 'range_key') {
      return { ...typed, type: 'rangeKey' };
    }
  }
  return value;
}

function fromRulesLensStateToAPI(rules: ColorMapping.ColorRule[]): SerializableValueType[] {
  return rules
    .filter((rule): rule is Extract<ColorMapping.ColorRule, { type: 'raw' }> => rule.type === 'raw')
    .map((rule) => mapSerializedValueToAPI(rule.value));
}

function isLensStateCategoricalConfigColorMapping(
  colorMapping: ColorMapping.Config
): colorMapping is ColorMapping.CategoricalConfig {
  return colorMapping.colorMode.type === 'categorical';
}

function fromUnassignedColorLensStateToAPI(
  color: ColorMapping.CategoricalColor | ColorMapping.ColorCode | ColorMapping.LoopColor | undefined
): UnassignedColorType | undefined {
  if (!color || color.type === 'loop') {
    return undefined;
  }
  return fromColorLensStateToAPI(color);
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
    } satisfies ColorMappingCategoricalType;
  }
  if (!colorMapping) {
    return;
  }

  const unassigned = fromUnassignedColorLensStateToAPI(colorMapping.specialAssignments[0]?.color);
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
      ...(unassigned ? { unassigned } : {}),
    } satisfies ColorMappingCategoricalType;
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
    sort: (colorMapping.colorMode as ColorMapping.GradientColorMode).sort,
    gradient: colorMode.steps.map((color) => fromColorLensStateToAPI(color)),
    ...(unassigned ? { unassigned } : {}),
  } satisfies ColorMappingGradientType;
}

function fromColorDefAPIToLensState(
  color: ColorMappingColorDefType
): ColorMapping.CategoricalColor | ColorMapping.ColorCode {
  if (color.type === 'color_code') {
    return {
      type: 'colorCode',
      colorCode: color.value,
    };
  }
  return {
    type: 'categorical',
    paletteId: (color.palette as KbnPaletteId) ?? LENS_DEFAULT_COLOR_MAPPING_PALETTE,
    colorIndex: color.index,
  };
}

function fromRulesAPIToLensState(values: SerializableValueType[]): ColorMapping.ColorRule[] {
  return values.map((value): ColorMapping.ColorRule => {
    return {
      type: 'raw',
      value: mapSerializedValueFromAPI(value),
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
  return colorMapping.mapping.map((assignment) => {
    return {
      rules: fromRulesAPIToLensState(assignment.values),
      color: { type: 'gradient' },
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
      color: colorMapping.unassigned
        ? fromColorDefAPIToLensState(colorMapping.unassigned)
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
          sort: colorMapping.sort ?? 'asc',
        };

  return {
    colorMapping: {
      colorMode,
      paletteId: colorMapping.palette as KbnPaletteId,
      assignments,
      specialAssignments,
    },
  };
}

export function isColorByValueColor(color?: AllColoringTypes): color is ColorByValueType {
  if (!color || !('type' in color)) return false;
  return color.type === 'dynamic' || color.type === 'legacy_dynamic';
}

export function isColorByValueAbsolute(color?: AllColoringTypes): color is ColorByValueAbsolute {
  // This is needed because the schema for `absolute` and `percentage` are combined in one
  return isColorByValueColor(color) && color.range === 'absolute';
}

export function isColorMappingColor(color?: AllColoringTypes): color is ColorMappingType {
  if (!color || !('mode' in color)) return false;
  return color.mode === 'categorical' || color.mode === 'gradient';
}

export function isNoColor(color?: AllColoringTypes): color is NoColorType {
  return !!color && 'type' in color && color.type === 'none';
}

export function isAutoColor(color?: AllColoringTypes): color is AutoColorType {
  return !!color && 'type' in color && color.type === 'auto';
}

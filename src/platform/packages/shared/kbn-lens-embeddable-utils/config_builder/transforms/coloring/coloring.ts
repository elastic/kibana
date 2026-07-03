/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ColorMapping,
  ColorStop,
  CustomPaletteParams,
  PaletteContinuity,
  PaletteOutput,
} from '@kbn/coloring';
import { DEFAULT_COLOR_STEPS } from '@kbn/coloring';
import type { KbnPaletteId } from '@kbn/palettes';
import type {
  AllColoringTypes,
  AutoColorType,
  ColorByValueAbsolute,
  ColorByValuePaletteType,
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

/**
 * Translates a Lens state palette `continuity` into the API's open-ended booleans.
 * Continuity (not numeric bounds) is the source of truth for named palettes.
 */
function fromContinuityToOpenBounds(
  continuity: PaletteContinuity
): Pick<ColorByValuePaletteType, 'open_above' | 'open_below'> {
  return {
    open_above: continuity === 'above' || continuity === 'all',
    open_below: continuity === 'below' || continuity === 'all',
  };
}

/**
 * Inverse of {@link fromContinuityToOpenBounds}: derives the Lens palette
 * `continuity` from the API's open-ended booleans.
 */
function fromOpenBoundsToContinuity({
  open_above: openAbove,
  open_below: openBelow,
}: Pick<ColorByValuePaletteType, 'open_above' | 'open_below'>): PaletteContinuity {
  if (openAbove && openBelow) return 'all';
  if (openAbove) return 'above';
  if (openBelow) return 'below';
  return 'none';
}

/**
 * Builds the Lens palette state for a named palette. A named palette doesn't need to
 * have per-band `stops`/`colorStops`: its colors are derived at render time from the
 * palette id + `steps` (see `getOverridePaletteColors`). Only three things matter:
 * - `steps`: how many bands to split the domain into (`numberOfBands`).
 * - `rangeType`: `percent` by default, or `number` when `useNumericRange` is `true`. Named
 *   palettes color a percentage domain; single-value charts (single-value metric charts and
 * legacy metric) opt into a numeric one.
 * - `continuity`: which ends of the domain are open.
 */
function buildNamedPaletteLensState({
  palette,
  continuity,
  numberOfBands,
  useNumericRange,
}: {
  palette: string;
  continuity: PaletteContinuity;
  numberOfBands: number;
  useNumericRange: boolean;
}): PaletteOutput<CustomPaletteParams> {
  return {
    type: 'palette',
    name: palette,
    params: {
      name: palette,
      progression: 'fixed', // to be removed
      reverse: false, // always applied to steps during transform
      rangeType: useNumericRange ? 'number' : 'percent',
      continuity,
      steps: numberOfBands,
      maxSteps: Math.max(DEFAULT_COLOR_STEPS, numberOfBands),
    },
  };
}

/**
 * API -> Lens state for a named (`dynamic_palette`) palette.
 * - `continuity` is derived from the API's `open_above`/`open_below` bounds.
 * - `numberOfBands` is the per-chart default band count used to split the domain.
 * - `useNumericRange` defaults to `false` (`percent`). Single-value charts (metric without
 *   a max or breakdown, and legacy metric) pass `true` (`number`) instead, since they color a
 *   single value across an absolute range where percentages are meaningless.
 */
function fromColorByValuePaletteAPIToLensState(
  config: ColorByValuePaletteType,
  numberOfBands: number = DEFAULT_COLOR_STEPS,
  useNumericRange: boolean = false
): PaletteOutput<CustomPaletteParams> {
  const { palette, open_above: openAbove, open_below: openBelow } = config;
  return buildNamedPaletteLensState({
    palette,
    continuity: fromOpenBoundsToContinuity({ open_above: openAbove, open_below: openBelow }),
    numberOfBands,
    useNumericRange,
  });
}

/**
 * API -> Lens state for a deprecated `legacy_dynamic` palette. Rebuilt as a named palette
 * (no per-band stops), reading only the `palette` name and the outer bounds of `steps`:
 * - `continuity` is derived from the first/last step bounds.
 * - `numberOfBands` and `rangeType` come from the arguments (`numberOfBands`, `useNumericRange`);
 *   the config's own `steps` count and `range` are ignored.
 * - The `shift` flag is ignored.
 */
function fromLegacyColorByValueAPIToLensState(
  config: Extract<ColorByValueType, { type: 'legacy_dynamic' }>,
  numberOfBands: number = DEFAULT_COLOR_STEPS,
  useNumericRange: boolean = false
): PaletteOutput<CustomPaletteParams> {
  const { palette, steps } = config;
  const rangeMin = steps.at(0)?.gte ?? null;
  const rangeMax = steps.at(-1)?.lt ?? steps.at(-1)?.lte ?? null;
  return buildNamedPaletteLensState({
    palette,
    continuity: getContinuity(rangeMin, rangeMax),
    numberOfBands,
    useNumericRange,
  });
}

/**
 * API -> Lens state entry point for color by value. Routes on the config `type`:
 * - `dynamic_palette` / `legacy_dynamic` -> a named palette whose bands are owned by the
 *   palette service (`numberOfBands` and `useNumericRange` configure the band count and range).
 * - `dynamic` -> a `custom` palette with explicit per-band `stops`/`colorStops` and numeric
 *   `rangeMin`/`rangeMax` derived from the steps; `numberOfBands`/`useNumericRange` do not apply.
 */
export function fromColorByValueAPIToLensState(
  config?: ColorByValueType,
  numberOfBands?: number,
  useNumericRange: boolean = false
): PaletteOutput<CustomPaletteParams> | undefined {
  if (!config) return;

  if (config.type === 'dynamic_palette') {
    return fromColorByValuePaletteAPIToLensState(config, numberOfBands, useNumericRange);
  }

  // `legacy_dynamic` is parse-only (deprecated) and is rebuilt as a named palette.
  if (config.type === 'legacy_dynamic') {
    return fromLegacyColorByValueAPIToLensState(config, numberOfBands, useNumericRange);
  }

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

  return {
    type: 'palette',
    name: 'custom',
    params: {
      name: 'custom',
      progression: 'fixed', // to be removed
      reverse: false, // always applied to steps during transform
      // @ts-expect-error - This can be null
      rangeMin,
      // @ts-expect-error - This can be null
      rangeMax,
      rangeType: paletteRangeCompat.toState(config.range ?? 'absolute'),
      stops,
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

/**
 * Lens state -> API for color by value; inverse of {@link fromColorByValueAPIToLensState}.
 * - A named (non-custom) palette becomes a `dynamic_palette`: per-band stops are dropped and
 *   `continuity` is re-expressed as `open_above`/`open_below` bounds.
 * - A customs palette becomes a `dynamic` config, rematerializing each stop as a
 *   `{ gte, lt | lte, color }` step and applying `reverse` to the stop colors first.
 */
export function fromColorByValueLensStateToAPI(
  config: PaletteOutput<CustomPaletteParams> | undefined
): ColorByValueType | undefined {
  const colorParams = config?.params;

  if (!colorParams) return;

  // config.name is the root palette identifier used by the runtime palette service
  const palette = config.name ?? colorParams.name ?? 'custom';
  const rangeMin = getRangeValue(colorParams.rangeMin);
  const rangeMax = getRangeValue(colorParams.rangeMax);

  // A named (non-custom) palette maps to `dynamic_palette`, where the palette
  // service owns the individual bands. Continuity (not numeric bounds) is the
  // source of truth for the open-ended behavior, so the per-band stops are dropped.
  if (palette !== 'custom') {
    const continuity = colorParams.continuity ?? getContinuity(rangeMin, rangeMax);
    return {
      type: 'dynamic_palette',
      palette,
      ...fromContinuityToOpenBounds(continuity),
    };
  }

  const { rangeType, reverse } = colorParams;
  const originalStops = colorParams.stops ?? [];

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

/**
 * Mirrors the renderable rule shapes from `ColorAssignmentMatcher#getKey`:
 *   - `raw` -> serialized value.
 *   - `match` with `matchEntireWord: true` -> bare pattern string; lowercased
 *     when `matchCase` is falsy (matcher lowercases the rule side on lookup).
 * Other shapes (`match` with `matchEntireWord: false`, `regex`, `range`) are not
 * renderable and are silently dropped.
 *
 * Round-trip rebuilds everything as `type: 'raw'` (see `fromRulesAPIToLensState`).
 * Render-equivalent for editor-produced match rules, since both reduce to the
 * same `String(rawValue)` lookup.
 */
function fromRulesLensStateToAPI(rules: ColorMapping.ColorRule[]): SerializableValueType[] {
  const isRawRule = (
    rule: ColorMapping.ColorRule
  ): rule is Extract<ColorMapping.ColorRule, { type: 'raw' }> => rule.type === 'raw';

  const isRenderableMatchRule = (
    rule: ColorMapping.ColorRule
  ): rule is Extract<ColorMapping.ColorRule, { type: 'match' }> =>
    rule.type === 'match' && rule.matchEntireWord === true;

  return rules
    .filter(
      (rule): rule is Extract<ColorMapping.ColorRule, { type: 'raw' | 'match' }> =>
        isRawRule(rule) || isRenderableMatchRule(rule)
    )
    .map((rule) =>
      isRawRule(rule)
        ? mapSerializedValueToAPI(rule.value)
        : rule.matchCase
        ? rule.pattern
        : rule.pattern.toLowerCase()
    );
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
  return (
    color.type === 'dynamic' || color.type === 'dynamic_palette' || color.type === 'legacy_dynamic'
  );
}

export function isColorByValuePalette(color?: AllColoringTypes): color is ColorByValuePaletteType {
  return !!color && 'type' in color && color.type === 'dynamic_palette';
}

export function isColorByValueAbsolute(
  color?: AllColoringTypes
): color is ColorByValueAbsolute | ColorByValuePaletteType {
  return isColorByValueColor(color) && 'range' in color && color.range === 'absolute';
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

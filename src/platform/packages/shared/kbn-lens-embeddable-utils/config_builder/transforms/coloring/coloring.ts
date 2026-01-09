/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isNil } from 'lodash';

import type { ColorMapping, ColorStop, CustomPaletteParams, PaletteOutput } from '@kbn/coloring';

import type {
  ColorByValueStep,
  ColorByValueType,
  ColorMappingColorDefType,
  ColorMappingType,
  StaticColorType,
} from '../../schema/color';
import type { SerializableValueType } from '../../schema/serializedValue';

const LENS_COLOR_BY_VALUE_RANGE_TYPE = 'absolute';
const LENS_DEFAULT_COLOR_MAPPING_PALETTE = 'default';

const LEGACY_TO_API_RANGE_NAMES: Record<'percent' | 'number', 'percentage' | 'absolute'> = {
  number: 'absolute',
  percent: 'percentage',
};

const API_TO_LEGACY_RANGE_NAMES: Record<'percentage' | 'absolute', 'percent' | 'number'> = {
  absolute: 'number',
  percentage: 'percent',
};

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
      rangeType: config.range
        ? API_TO_LEGACY_RANGE_NAMES[config.range]
        : API_TO_LEGACY_RANGE_NAMES.absolute,
      stops,
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

export function fromColorByValueLensStateToAPI(
  config: PaletteOutput<CustomPaletteParams> | undefined
): ColorByValueType | undefined {
  const colorParams = config?.params;

  if (!colorParams) return;

  const { stops: originalStops = [], rangeType, reverse } = colorParams;
  const stops = !reverse
    ? originalStops
    : originalStops
        .slice()
        .reverse()
        .map(({ color }, i) => ({
          ...originalStops[i],
          color,
        }));

  return {
    type: 'dynamic',
    range: rangeType ? LEGACY_TO_API_RANGE_NAMES[rangeType] : LENS_COLOR_BY_VALUE_RANGE_TYPE,
    steps: stops.map((step, i): ColorByValueStep => {
      const { stop: currentStop, color } = step;
      if (i === 0) {
        return {
          ...(!isNil(colorParams.rangeMin) && { gte: colorParams.rangeMin }),
          lt: currentStop,
          color,
        };
      }

      const prevStop = stops[i - 1].stop ?? undefined;

      if (i === stops.length - 1) {
        return {
          gte: prevStop,
          // ignores stop value, current logic sets last stop to max domain not user defined rangeMax
          ...(!isNil(colorParams.rangeMax) && { lte: colorParams.rangeMax }),
          color,
        };
      }

      return {
        gte: prevStop,
        lt: currentStop,
        color,
      };
    }),
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
  if (unassignedColor.type === 'from_palette') {
    return {};
  }
  return { unassignedColor };
}

export function fromColorMappingLensStateToAPI(
  colorMapping: ColorMapping.Config | undefined
): ColorMappingType | undefined {
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
  const colorAssignments = colorMapping.assignments.filter(
    (
      assignment
    ): assignment is ColorMapping.AssignmentBase<
      ColorMapping.ColorRule,
      ColorMapping.CategoricalColor | ColorMapping.ColorCode
    > => assignment.color.type !== 'gradient'
  );
  return {
    mode: 'gradient',
    palette: colorMapping.paletteId,
    mapping: colorAssignments.map(({ rules }) => {
      return {
        values: fromRulesLensStateToAPI(rules),
      };
    }),
    gradient: colorAssignments.map(({ color }) => fromColorLensStateToAPI(color)),
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
): ColorMapping.Config | undefined {
  if (!colorMapping) {
    return;
  }
  const specialAssignments: ColorMapping.SpecialAssignment[] = [
    {
      rules: [
        {
          type: 'other',
        },
      ],
      color: colorMapping.unassignedColor
        ? {
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
          // in the conversion we've lost the actual sort order, so default to "asc"
          sort: 'asc',
        };

  return {
    colorMode,
    paletteId: colorMapping.palette,
    assignments,
    specialAssignments,
  };
}

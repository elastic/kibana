/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import color from 'color';
import { ColorStop, CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { uniqBy } from 'lodash';
import { Panel } from '../../../../../common/types';

const Operators = {
  GTE: 'gte',
  GT: 'gt',
  LTE: 'lte',
  LT: 'lt',
} as const;

type ColorStopsWithMinMax = Pick<
  CustomPaletteParams,
  'colorStops' | 'stops' | 'steps' | 'rangeMax' | 'rangeMin' | 'continuity'
>;

const getColorStopsWithMinMaxForAllGteOrWithLte = (
  rules: Exclude<Panel['background_color_rules'], undefined>,
  tailOperator: string
): ColorStopsWithMinMax => {
  const lastRule = rules[rules.length - 1];
  const lastRuleColor = (lastRule.background_color ?? lastRule.color)!;

  const colorStops = rules.reduce<ColorStop[]>((colors, rule, index, rulesArr) => {
    const rgbColor = (rule.background_color ?? rule.color)!;
    if (index === rulesArr.length - 1 && tailOperator === Operators.LTE) {
      return colors;
    }
    // if last operation is LTE, color of gte should be replaced by lte
    if (index === rulesArr.length - 2 && tailOperator === Operators.LTE) {
      return [
        ...colors,
        {
          color: color(lastRuleColor).hex(),
          stop: rule.value!,
        },
      ];
    }
    return [
      ...colors,
      {
        color: color(rgbColor).hex(),
        stop: rule.value!,
      },
    ];
  }, []);

  const stops = colorStops.reduce<ColorStop[]>((prevStops, colorStop, index, colorStopsArr) => {
    if (index === colorStopsArr.length - 1) {
      return [
        ...prevStops,
        {
          color: colorStop.color,
          stop: tailOperator === Operators.LTE ? lastRule.value! : colorStop.stop + 1,
        },
      ];
    }
    return [...prevStops, { color: colorStop.color, stop: colorStopsArr[index + 1].stop }];
  }, []);

  const [rule] = rules;
  return {
    rangeMin: rule.value,
    rangeMax: tailOperator === Operators.LTE ? lastRule.value : Infinity,
    colorStops,
    stops,
    steps: colorStops.length,
    continuity: tailOperator === Operators.LTE ? 'none' : 'above',
  };
};

const getColorStopsWithMinMaxForLtWithLte = (
  rules: Exclude<Panel['background_color_rules'], undefined>
): ColorStopsWithMinMax => {
  const lastRule = rules[rules.length - 1];
  const colorStops = rules.reduce<ColorStop[]>((colors, rule, index, rulesArr) => {
    if (index === 0) {
      return [{ color: color((rule.background_color ?? rule.color)!).hex(), stop: -Infinity }];
    }
    const rgbColor = (rule.background_color ?? rule.color)!;
    return [
      ...colors,
      {
        color: color(rgbColor).hex(),
        stop: rulesArr[index - 1].value!,
      },
    ];
  }, []);

  const stops = colorStops.reduce<ColorStop[]>((prevStops, colorStop, index, colorStopsArr) => {
    if (index === colorStopsArr.length - 1) {
      return [
        ...prevStops,
        {
          color: colorStop.color,
          stop: lastRule.value!,
        },
      ];
    }
    return [...prevStops, { color: colorStop.color, stop: colorStopsArr[index + 1].stop }];
  }, []);

  return {
    rangeMin: -Infinity,
    rangeMax: lastRule.value,
    colorStops,
    stops,
    steps: colorStops.length + 1,
    continuity: 'below',
  };
};

const getColorStopWithMinMaxForLte = (
  rule: Exclude<Panel['background_color_rules'], undefined>[number]
): ColorStopsWithMinMax => {
  const colorStop = {
    color: color((rule.background_color ?? rule.color)!).hex(),
    stop: rule.value!,
  };
  return {
    rangeMin: -Infinity,
    rangeMax: rule.value!,
    colorStops: [colorStop],
    stops: [colorStop],
    steps: 1,
    continuity: 'below',
  };
};

const getCustomPalette = (
  colorStopsWithMinMax: ColorStopsWithMinMax
): PaletteOutput<CustomPaletteParams> => {
  return {
    name: 'custom',
    params: {
      continuity: 'all',
      maxSteps: 5,
      name: 'custom',
      progression: 'fixed',
      rangeMax: Infinity,
      rangeMin: -Infinity,
      rangeType: 'number',
      reverse: false,
      ...colorStopsWithMinMax,
    },
    type: 'palette',
  };
};

export const getPalette = (
  rules: Exclude<Panel['background_color_rules'], undefined>
): PaletteOutput<CustomPaletteParams> | null | undefined => {
  const validRules =
    rules.filter(
      ({ operator, color: textColor, value, background_color: bColor }) =>
        operator && (bColor ?? textColor) && value !== undefined
    ) ?? [];

  validRules.sort((rule1, rule2) => {
    return rule1.value! - rule2.value!;
  });

  const kindOfRules = uniqBy(validRules, 'operator');

  if (!kindOfRules.length) {
    return;
  }

  // lnsMetric is supporting lte only, if one rule is defined
  if (validRules.length === 1) {
    if (validRules[0].operator !== Operators.LTE) {
      return;
    }
    return getCustomPalette(getColorStopWithMinMaxForLte(validRules[0]));
  }

  const headRules = validRules.slice(0, -1);
  const tailRule = validRules[validRules.length - 1];
  const kindOfHeadRules = uniqBy(headRules, 'operator');

  if (
    kindOfHeadRules.length > 1 ||
    (kindOfHeadRules[0].operator !== tailRule.operator && tailRule.operator !== Operators.LTE)
  ) {
    return;
  }

  const [rule] = kindOfHeadRules;

  if (rule.operator === Operators.LTE) {
    return;
  }

  if (rule.operator === Operators.LT) {
    if (tailRule.operator !== Operators.LTE) {
      return;
    }
    return getCustomPalette(getColorStopsWithMinMaxForLtWithLte(validRules));
  }

  if (rule.operator === Operators.GTE) {
    return getCustomPalette(
      getColorStopsWithMinMaxForAllGteOrWithLte(validRules, tailRule.operator!)
    );
  }
};

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
import { Panel, Series } from '../../../../../common/types';

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

type MetricColorRules = Exclude<Panel['background_color_rules'], undefined>;
type GaugeColorRules = Exclude<Panel['gauge_color_rules'], undefined>;
type SeriesColorRules = Exclude<Series['color_rules'], undefined>;

type MetricColorRule = MetricColorRules[number];
type GaugeColorRule = GaugeColorRules[number];
type SeriesColorRule = SeriesColorRules[number];

type ValidMetricColorRule = Omit<MetricColorRule, 'background_color' | 'color'> &
  (
    | {
        background_color: Exclude<MetricColorRule['background_color'], undefined>;
        color: MetricColorRule['color'];
      }
    | {
        background_color: MetricColorRule['background_color'];
        color: Exclude<MetricColorRule['color'], undefined>;
      }
  );

type ValidGaugeColorRule = Omit<GaugeColorRule, 'gauge'> & {
  gauge: Exclude<GaugeColorRule['gauge'], undefined>;
};

type ValidSeriesColorRule = Omit<SeriesColorRule, 'text'> & {
  text: Exclude<SeriesColorRule['text'], undefined>;
};

const isValidColorRule = (
  rule: MetricColorRule | GaugeColorRule
): rule is ValidMetricColorRule | ValidGaugeColorRule | ValidSeriesColorRule => {
  const { background_color: bColor, color: textColor } = rule as MetricColorRule;
  const { gauge } = rule as GaugeColorRule;
  const { text } = rule as SeriesColorRule;

  return Boolean(
    rule.operator && (bColor ?? textColor ?? gauge ?? text) && rule.value !== undefined
  );
};

const isMetricColorRule = (
  rule: ValidMetricColorRule | ValidGaugeColorRule | ValidSeriesColorRule
): rule is ValidMetricColorRule => {
  const metricRule = rule as ValidMetricColorRule;
  return metricRule.background_color ?? metricRule.color ? true : false;
};

const isGaugeColorRule = (
  rule: ValidMetricColorRule | ValidGaugeColorRule | ValidSeriesColorRule
): rule is ValidGaugeColorRule => {
  const metricRule = rule as ValidGaugeColorRule;
  return Boolean(metricRule.gauge);
};

const getColor = (rule: ValidMetricColorRule | ValidGaugeColorRule | ValidSeriesColorRule) => {
  if (isMetricColorRule(rule)) {
    return rule.background_color ?? rule.color;
  } else if (isGaugeColorRule(rule)) {
    return rule.gauge;
  }
  return rule.text;
};

const getColorStopsWithMinMaxForAllGteOrWithLte = (
  rules: Array<ValidMetricColorRule | ValidGaugeColorRule | ValidSeriesColorRule>,
  tailOperator: string,
  baseColor?: string
): ColorStopsWithMinMax => {
  const lastRule = rules[rules.length - 1];
  const lastRuleColor = getColor(lastRule);
  const initRules = baseColor ? [{ stop: -Infinity, color: baseColor }] : [];
  const colorStops = rules.reduce<ColorStop[]>((colors, rule, index, rulesArr) => {
    const rgbColor = getColor(rule);
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
  }, initRules);

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
    rangeMin: baseColor ? -Infinity : rule.value,
    rangeMax: tailOperator === Operators.LTE ? lastRule.value : Infinity,
    colorStops,
    stops,
    steps: colorStops.length,
    continuity:
      tailOperator === Operators.LTE ? (baseColor ? 'below' : 'none') : baseColor ? 'all' : 'above',
  };
};

const getColorStopsWithMinMaxForLtWithLte = (
  rules: Array<ValidMetricColorRule | ValidGaugeColorRule | ValidSeriesColorRule>
): ColorStopsWithMinMax => {
  const lastRule = rules[rules.length - 1];
  const colorStops = rules.reduce<ColorStop[]>((colors, rule, index, rulesArr) => {
    if (index === 0) {
      return [{ color: color(getColor(rule)).hex(), stop: -Infinity }];
    }
    const rgbColor = getColor(rule);
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
  rule: ValidMetricColorRule | ValidGaugeColorRule | ValidSeriesColorRule
): ColorStopsWithMinMax => {
  const colorStop = {
    color: color(getColor(rule)).hex(),
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

const getColorStopWithMinMaxForGte = (
  rule: ValidMetricColorRule | ValidGaugeColorRule | ValidSeriesColorRule,
  baseColor?: string
): ColorStopsWithMinMax => {
  const colorStop = {
    color: color(getColor(rule)).hex(),
    stop: rule.value!,
  };
  return {
    colorStops: [...(baseColor ? [{ color: baseColor, stop: -Infinity }] : []), colorStop],
    continuity: baseColor ? 'all' : 'above',
    rangeMax: Infinity,
    rangeMin: baseColor ? -Infinity : colorStop.stop,
    steps: 2,
    stops: [
      ...(baseColor ? [{ color: baseColor, stop: colorStop.stop }] : []),
      { color: colorStop.color, stop: Infinity },
    ],
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
  rules: MetricColorRules | GaugeColorRules | SeriesColorRules,
  baseColor?: string
): PaletteOutput<CustomPaletteParams> | null | undefined => {
  const validRules = (rules as Array<MetricColorRule | GaugeColorRule | SeriesColorRule>).filter<
    ValidMetricColorRule | ValidGaugeColorRule | ValidSeriesColorRule
  >((rule): rule is ValidMetricColorRule | ValidGaugeColorRule | ValidSeriesColorRule =>
    isValidColorRule(rule)
  );

  validRules.sort((rule1, rule2) => {
    return rule1.value! - rule2.value!;
  });

  const kindOfRules = uniqBy(validRules, 'operator');

  if (!kindOfRules.length) {
    return;
  }

  // lnsMetric is supporting lte only, if one rule is defined
  if (validRules.length === 1) {
    if (validRules[0].operator === Operators.LTE) {
      return getCustomPalette(getColorStopWithMinMaxForLte(validRules[0]));
    }

    if (validRules[0].operator === Operators.GTE) {
      return getCustomPalette(getColorStopWithMinMaxForGte(validRules[0], baseColor));
    }
    return;
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
      getColorStopsWithMinMaxForAllGteOrWithLte(validRules, tailRule.operator!, baseColor)
    );
  }
};

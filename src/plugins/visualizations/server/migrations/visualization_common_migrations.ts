/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, last } from 'lodash';
import uuid from 'uuid';

export const commonAddSupportOfDualIndexSelectionModeInTSVB = (visState: any) => {
  if (visState && visState.type === 'metrics') {
    const { params } = visState;

    if (typeof params?.index_pattern === 'string') {
      params.use_kibana_indexes = false;
    }
  }
  return visState;
};

export const commonAddDropLastBucketIntoTSVBModel = (visState: any) => {
  if (visState && visState.type === 'metrics') {
    return {
      ...visState,
      params: {
        ...visState.params,
        series: visState.params?.series?.map((s: any) =>
          s.override_index_pattern
            ? {
                ...s,
                series_drop_last_bucket: s.series_drop_last_bucket ?? 1,
              }
            : s
        ),
        drop_last_bucket: visState.params.drop_last_bucket ?? 1,
      },
    };
  }
  return visState;
};

export const commonAddDropLastBucketIntoTSVBModel714Above = (visState: any) => {
  if (visState && visState.type === 'metrics') {
    return {
      ...visState,
      params: {
        ...visState.params,
        drop_last_bucket: visState.params.drop_last_bucket ?? 1,
      },
    };
  }
  return visState;
};

export const commonHideTSVBLastValueIndicator = (visState: any) => {
  if (visState && visState.type === 'metrics' && visState.params.type !== 'timeseries') {
    return {
      ...visState,
      params: {
        ...visState.params,
        hide_last_value_indicator: true,
      },
    };
  }
  return visState;
};

export const commonRemoveDefaultIndexPatternAndTimeFieldFromTSVBModel = (visState: any) => {
  if (visState && visState.type === 'metrics') {
    const { params } = visState;

    delete params.default_index_pattern;
    delete params.default_timefield;

    return visState;
  }

  return visState;
};

export const commonAddEmptyValueColorRule = (visState: any) => {
  if (visState && visState.type === 'metrics') {
    const params: any = get(visState, 'params') || {};

    const getRuleWithComparingToZero = (rules: any[] = []) => {
      const compareWithEqualMethods = ['gte', 'lte'];
      return last(
        rules.filter((rule) => compareWithEqualMethods.includes(rule.operator) && rule.value === 0)
      );
    };

    const convertRuleToEmpty = (rule: any = {}) => ({
      ...rule,
      id: uuid.v4(),
      operator: 'empty',
      value: null,
    });

    const addEmptyRuleToListIfNecessary = (rules: any[]) => {
      const rule = getRuleWithComparingToZero(rules);

      if (rule) {
        return [...rules, convertRuleToEmpty(rule)];
      }

      return rules;
    };

    const colorRules = {
      bar_color_rules: addEmptyRuleToListIfNecessary(params.bar_color_rules),
      background_color_rules: addEmptyRuleToListIfNecessary(params.background_color_rules),
      gauge_color_rules: addEmptyRuleToListIfNecessary(params.gauge_color_rules),
    };

    return {
      ...visState,
      params: {
        ...params,
        ...colorRules,
      },
    };
  }

  return visState;
};

export const commonMigrateVislibPie = (visState: any) => {
  if (visState && visState.type === 'pie') {
    const { params } = visState;
    const hasPalette = params?.palette;

    return {
      ...visState,
      params: {
        ...visState.params,
        ...(!hasPalette && {
          palette: {
            type: 'palette',
            name: 'kibana_palette',
          },
        }),
        distinctColors: true,
      },
    };
  }

  return visState;
};

export const commonMigrateTagCloud = (visState: any) => {
  if (visState && visState.type === 'tagcloud') {
    const { params } = visState;
    const hasPalette = params?.palette;

    return {
      ...visState,
      params: {
        ...visState.params,
        ...(!hasPalette && {
          palette: {
            type: 'palette',
            name: 'kibana_palette',
          },
        }),
      },
    };
  }

  return visState;
};

export const commonRemoveMarkdownLessFromTSVB = (visState: any) => {
  if (visState && visState.type === 'metrics') {
    const params: any = get(visState, 'params') || {};

    if (params.type === 'markdown') {
      // remove less
      if (params.markdown_less) {
        delete params.markdown_less;
      }

      // remove markdown id from css
      if (params.markdown_css) {
        params.markdown_css = params.markdown_css
          .replace(new RegExp(`#markdown-${params.id}`, 'g'), '')
          .trim();
      }
    }

    return {
      ...visState,
      params: {
        ...params,
      },
    };
  }

  return visState;
};

export const commonUpdatePieVisApi = (visState: any) => {
  if (visState && visState.type === 'pie') {
    const { addLegend, ...restParams } = visState.params;

    return {
      ...visState,
      params: {
        ...restParams,
        legendDisplay: addLegend ? 'show' : 'hide',
      },
    };
  }

  return visState;
};

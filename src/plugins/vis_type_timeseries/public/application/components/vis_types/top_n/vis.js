/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getCoreStart } from '../../../../services';
import { createTickFormatter } from '../../lib/tick_formatter';
import { TopN } from '../../../visualizations/views/top_n';
import { getLastValue } from '../../../../../common/get_last_value';
import { isBackgroundInverted } from '../../../lib/set_is_reversed';
import { replaceVars } from '../../lib/replace_vars';
import PropTypes from 'prop-types';
import React from 'react';
import { sortBy, first, get, gt, gte, lt, lte } from 'lodash';
const OPERATORS = { gt, gte, lt, lte };

function sortByDirection(data, direction, fn) {
  if (direction === 'desc') {
    return sortBy(data, fn).reverse();
  }
  return sortBy(data, fn);
}

function sortSeries(visData, model) {
  const series = get(visData, `${model.id}.series`, []);
  return model.series.reduce((acc, item) => {
    const itemSeries = series.filter((s) => {
      const id = first(s.id.split(/:/));
      return id === item.id;
    });
    const direction = item.terms_direction || 'desc';
    if (item.terms_order_by === '_key') return acc.concat(itemSeries);
    return acc.concat(sortByDirection(itemSeries, direction, (s) => getLastValue(s.data)));
  }, []);
}

function TopNVisualization(props) {
  const { backgroundColor, model, visData } = props;

  const series = sortSeries(visData, model).map((item) => {
    const id = first(item.id.split(/:/));
    const seriesConfig = model.series.find((s) => s.id === id);
    if (seriesConfig) {
      const tickFormatter = createTickFormatter(
        seriesConfig.formatter,
        seriesConfig.value_template,
        props.getConfig
      );
      const value = getLastValue(item.data);
      let color = item.color || seriesConfig.color;
      if (model.bar_color_rules) {
        model.bar_color_rules.forEach((rule) => {
          if (rule.operator && rule.value != null && rule.bar_color) {
            if (OPERATORS[rule.operator](value, rule.value)) {
              color = rule.bar_color;
            }
          }
        });
      }
      return {
        ...item,
        color,
        tickFormatter,
      };
    }
    return item;
  });

  const panelBackgroundColor = model.background_color || backgroundColor;
  const style = { backgroundColor: panelBackgroundColor };

  const params = {
    series: series,
    reversed: isBackgroundInverted(panelBackgroundColor),
  };

  if (model.drilldown_url) {
    params.onClick = (item) => {
      const url = replaceVars(model.drilldown_url, {}, { key: item.label });
      getCoreStart().application.navigateToUrl(url);
    };
  }

  return (
    <div className="tvbVis" style={style}>
      <TopN {...params} />
    </div>
  );
}

TopNVisualization.propTypes = {
  backgroundColor: PropTypes.string,
  className: PropTypes.string,
  model: PropTypes.object,
  onBrush: PropTypes.func,
  onChange: PropTypes.func,
  visData: PropTypes.object,
  getConfig: PropTypes.func,
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TopNVisualization as default };

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import tickFormatter from '../../lib/tick_formatter';
import TopN from '../../../visualizations/components/top_n';
import getLastValue from '../../../../common/get_last_value';
import color from 'color';
import replaceVars from '../../lib/replace_vars';
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
    const itemSeries =  series.filter(s => {
      const id = first(s.id.split(/:/));
      return id === item.id;
    });
    const direction = item.terms_direction || 'desc';
    if (item.terms_order_by === '_term') return acc.concat(itemSeries);
    return acc.concat(sortByDirection(itemSeries, direction, s => getLastValue(s.data)));
  }, []);
}

function TopNVisualization(props) {
  const { backgroundColor, model, visData } = props;

  const series = sortSeries(visData, model)
    .map(item => {
      const id = first(item.id.split(/:/));
      const seriesConfig = model.series.find(s => s.id === id);
      if (seriesConfig) {
        const formatter = tickFormatter(seriesConfig.formatter, seriesConfig.value_template, props.getConfig);
        const value = getLastValue(item.data);
        let color = item.color || seriesConfig.color;
        if (model.bar_color_rules) {
          model.bar_color_rules.forEach(rule => {
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
          tickFormatter: formatter
        };
      }
      return item;
    });

  const params = {
    series: series,
    reversed: props.reversed
  };
  const panelBackgroundColor = model.background_color || backgroundColor;

  if (panelBackgroundColor && panelBackgroundColor !== 'inherit') {
    params.reversed = color(panelBackgroundColor).luminosity() < 0.45;
  }

  if (model.drilldown_url) {
    params.onClick = (item) => {
      window.location = replaceVars(model.drilldown_url, {}, { key: item.label });
    };
  }
  const style = { backgroundColor: panelBackgroundColor };
  return (
    <div className="tvbVis" style={style}>
      <TopN {...params}/>
    </div>
  );

}

TopNVisualization.propTypes = {
  backgroundColor: PropTypes.string,
  className: PropTypes.string,
  model: PropTypes.object,
  onBrush: PropTypes.func,
  onChange: PropTypes.func,
  reversed: PropTypes.bool,
  visData: PropTypes.object,
  getConfig: PropTypes.func
};

export default TopNVisualization;

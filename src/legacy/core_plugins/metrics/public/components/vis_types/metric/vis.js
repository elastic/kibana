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

import PropTypes from 'prop-types';
import React from 'react';
import { visWithSplits } from '../../vis_with_splits';
import tickFormatter from '../../lib/tick_formatter';
import _ from 'lodash';
import Metric from '../../../visualizations/components/metric';
import getLastValue from '../../../../common/get_last_value';
import color from 'color';

function getColors(props) {
  const { model, visData } = props;
  const series = _.get(visData, `${model.id}.series`, []);
  let color;
  let background;
  if (model.background_color_rules) {
    model.background_color_rules.forEach((rule) => {
      if (rule.operator && rule.value != null) {
        const value = series[0] && getLastValue(series[0].data) || 0;
        if (_[rule.operator](value, rule.value)) {
          background = rule.background_color;
          color = rule.color;
        }
      }
    });
  }
  return { color, background };
}

function MetricVisualization(props) {
  const { backgroundColor, model, visData } = props;
  const colors = getColors(props);
  const series = _.get(visData, `${model.id}.series`, [])
    .filter(row => row)
    .map((row, i) => {
      const seriesDef = model.series.find(s => _.includes(row.id, s.id));
      const newProps = {};
      if (seriesDef) {
        newProps.formatter = tickFormatter(seriesDef.formatter, seriesDef.value_template, props.getConfig);
      }
      if (i === 0 && colors.color) newProps.color = colors.color;
      return _.assign({}, _.pick(row, ['label', 'data']), newProps);
    });
  const params = {
    metric: series[0],
    reversed: props.reversed,
    additionalLabel: props.additionalLabel
  };
  if (series[1]) {
    params.secondary = series[1];
  }

  const panelBackgroundColor = colors.background || backgroundColor;

  if (panelBackgroundColor && panelBackgroundColor !== 'inherit') {
    params.reversed = color(panelBackgroundColor).luminosity() < 0.45;
  }
  const style = { backgroundColor: panelBackgroundColor };
  params.backgroundColor = panelBackgroundColor;

  return (
    <div className="tvbVis" style={style}>
      <Metric {...params}/>
    </div>
  );

}

MetricVisualization.propTypes = {
  backgroundColor: PropTypes.string,
  className: PropTypes.string,
  additionalLabel: PropTypes.string,
  model: PropTypes.object,
  onBrush: PropTypes.func,
  onChange: PropTypes.func,
  reversed: PropTypes.bool,
  visData: PropTypes.object,
  getConfig: PropTypes.func
};

export default visWithSplits(MetricVisualization);

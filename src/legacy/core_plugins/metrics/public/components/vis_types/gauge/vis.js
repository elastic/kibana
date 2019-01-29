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
import Gauge from '../../../visualizations/components/gauge';
import getLastValue from '../../../../common/get_last_value';
import color from 'color';

function getColors(props) {
  const { model, visData } = props;
  const series = _.get(visData, `${model.id}.series`, []);
  let text;
  let gauge;
  if (model.gauge_color_rules) {
    model.gauge_color_rules.forEach((rule) => {
      if (rule.operator && rule.value != null) {
        const value = (series[0] && getLastValue(series[0].data)) ||
          series[1] && getLastValue(series[1].data) || 0;
        if (_[rule.operator](value, rule.value)) {
          gauge = rule.gauge;
          text = rule.text;
        }
      }
    });
  }
  return { text, gauge };
}

function GaugeVisualization(props) {
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
      if (i === 0 && colors.gauge) newProps.color = colors.gauge;
      return _.assign({}, row, newProps);
    });
  const params = {
    metric: series[0],
    type: model.gauge_style || 'half',
    reversed: props.reversed,
    additionalLabel: props.additionalLabel
  };

  if (colors.text) {
    params.valueColor = colors.text;
  }

  if (model.gauge_width) params.gaugeLine = model.gauge_width;
  if (model.gauge_inner_color) params.innerColor = model.gauge_inner_color;
  if (model.gauge_inner_width) params.innerLine = model.gauge_inner_width;
  if (model.gauge_max != null) params.max = model.gauge_max;

  const panelBackgroundColor = model.background_color || backgroundColor;

  if (panelBackgroundColor && panelBackgroundColor !== 'inherit') {
    params.reversed = color(panelBackgroundColor).luminosity() < 0.45;
  }
  const style = { backgroundColor: panelBackgroundColor };

  return (
    <div className="tvbVis" style={style}>
      <Gauge {...params} />
    </div>
  );
}

GaugeVisualization.propTypes = {
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

export default visWithSplits(GaugeVisualization);

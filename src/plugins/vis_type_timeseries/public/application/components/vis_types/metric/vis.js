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
import { createTickFormatter } from '../../lib/tick_formatter';
import _, { get, isUndefined, assign, includes, pick } from 'lodash';
import { Metric } from '../../../visualizations/views/metric';
import { getLastValue } from '../../../../../../../plugins/vis_type_timeseries/common/get_last_value';
import { isBackgroundInverted } from '../../../lib/set_is_reversed';

function getColors(props) {
  const { model, visData } = props;
  const series = get(visData, `${model.id}.series`, []).filter((s) => !isUndefined(s));
  let color;
  let background;
  if (model.background_color_rules) {
    model.background_color_rules.forEach((rule) => {
      if (rule.operator && rule.value != null) {
        const value = (series[0] && getLastValue(series[0].data)) || 0;
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
  const series = get(visData, `${model.id}.series`, [])
    .filter((row) => row)
    .map((row, i) => {
      const seriesDef = model.series.find((s) => includes(row.id, s.id));
      const newProps = {};
      if (seriesDef) {
        newProps.formatter = createTickFormatter(
          seriesDef.formatter,
          seriesDef.value_template,
          props.getConfig
        );
      }
      if (i === 0 && colors.color) newProps.color = colors.color;
      return assign({}, pick(row, ['label', 'data']), newProps);
    });

  const panelBackgroundColor = colors.background || backgroundColor;
  const style = { backgroundColor: panelBackgroundColor };

  const params = {
    metric: series[0],
    additionalLabel: props.additionalLabel,
    reversed: isBackgroundInverted(panelBackgroundColor),
  };

  if (series[1]) {
    params.secondary = series[1];
  }

  return (
    <div className="tvbVis" style={style}>
      <Metric {...params} />
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
  visData: PropTypes.object,
  getConfig: PropTypes.func,
};

export const metric = visWithSplits(MetricVisualization);

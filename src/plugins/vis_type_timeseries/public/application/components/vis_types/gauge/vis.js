/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { visWithSplits } from '../../vis_with_splits';
import { createTickFormatter } from '../../lib/tick_formatter';
import { get, isUndefined, assign, includes, gt, gte, lt, lte, isNull } from 'lodash';
import { Gauge } from '../../../visualizations/views/gauge';
import { getLastValueOrEmpty } from '../../../../../common/last_value_utils';
const OPERATORS = { gt, gte, lt, lte, empty: isNull };
const OPERATORS_ALLOW_NULL = {
  empty: true,
};

function getColors(props) {
  const { model, visData } = props;
  const series = get(visData, `${model.id}.series`, []).filter((s) => !isUndefined(s));
  let text;
  let gauge;
  if (model.gauge_color_rules) {
    model.gauge_color_rules.forEach((rule) => {
      if (rule.operator) {
        const value = getLastValueOrEmpty(series[0]?.data);
        // This check is necessary for preventing from comparing null values with numeric rules.
        const shouldOperate =
          (isNull(rule.value) && OPERATORS_ALLOW_NULL[rule.operator]) ||
          (!isNull(rule.value) && !isNull(value));

        if (shouldOperate && OPERATORS[rule.operator](value, rule.value)) {
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
      if (i === 0 && colors.gauge) newProps.color = colors.gauge;
      return assign({}, row, newProps);
    });

  const panelBackgroundColor = model.background_color || backgroundColor;
  const style = { backgroundColor: panelBackgroundColor };

  const params = {
    metric: series[0],
    type: model.gauge_style || 'half',
    additionalLabel: props.additionalLabel,
    backgroundColor: panelBackgroundColor,
  };

  if (colors.text) {
    params.valueColor = colors.text;
  }

  if (model.gauge_width) params.gaugeLine = model.gauge_width;
  if (model.gauge_inner_color) params.innerColor = model.gauge_inner_color;
  if (model.gauge_inner_width) params.innerLine = model.gauge_inner_width;
  if (model.gauge_max != null) params.max = model.gauge_max;

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
  onFilterClick: PropTypes.func,
  onChange: PropTypes.func,
  visData: PropTypes.object,
  getConfig: PropTypes.func,
};

const gauge = visWithSplits(GaugeVisualization);

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { gauge as default };

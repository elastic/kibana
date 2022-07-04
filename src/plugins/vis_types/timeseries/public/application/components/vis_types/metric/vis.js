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
import { getMetricsField } from '../../lib/get_metrics_field';
import { createTickFormatter } from '../../lib/tick_formatter';
import { createFieldFormatter } from '../../lib/create_field_formatter';
import { get, isUndefined, assign, includes, pick } from 'lodash';
import { Metric } from '../../../visualizations/views/metric';
import { DATA_FORMATTERS } from '../../../../../common/enums';
import { getLastValue } from '../../../../../common/last_value_utils';
import { isBackgroundInverted } from '../../../lib/set_is_reversed';
import { getOperator, shouldOperate } from '../../../../../common/operators_utils';

function getColors(props) {
  const { model, visData } = props;
  const series = get(visData, `${model.id}.series`, []).filter((s) => !isUndefined(s));
  let color;
  let background;
  if (model.background_color_rules) {
    model.background_color_rules.forEach((rule) => {
      if (rule.operator) {
        const value = getLastValue(series[0]?.data);
        if (shouldOperate(rule, value) && getOperator(rule.operator)(value, rule.value)) {
          background = rule.background_color;
          color = rule.color;
        }
      }
    });
  }
  return { color, background };
}

function MetricVisualization(props) {
  const { backgroundColor, model, visData, fieldFormatMap, getConfig } = props;
  const colors = getColors(props);
  const series = get(visData, `${model.id}.series`, [])
    .filter((row) => row)
    .map((row, i) => {
      const seriesDef = model.series.find((s) => includes(row.id, s.id));
      const newProps = {};
      if (seriesDef) {
        newProps.formatter =
          seriesDef.formatter === DATA_FORMATTERS.DEFAULT
            ? createFieldFormatter(
                getMetricsField(seriesDef.metrics),
                fieldFormatMap,
                'html',
                colors.color
              )
            : createTickFormatter(seriesDef.formatter, seriesDef.value_template, getConfig);
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
      <Metric {...params} initialRender={props.initialRender} />
    </div>
  );
}

MetricVisualization.propTypes = {
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

const metric = visWithSplits(MetricVisualization);

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { metric as default };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import PropTypes from 'prop-types';
import React from 'react';
import { visWithSplits } from '../../vis_with_splits';
import { getMetricsField } from '../../lib/get_metrics_field';
import { createTickFormatter } from '../../lib/tick_formatter';
import { createFieldFormatter } from '../../lib/create_field_formatter';
import { get, isUndefined, assign, includes } from 'lodash';
import { Gauge } from '../../../visualizations/views/gauge';
import { getLastValue } from '../../../../../common/last_value_utils';
import { DATA_FORMATTERS } from '../../../../../common/enums';
import { getOperator, shouldOperate } from '../../../../../common/operators_utils';

function getColors(props) {
  const { model, visData } = props;
  const series = get(visData, `${model.id}.series`, []).filter((s) => !isUndefined(s));
  let text;
  let gauge;
  if (model.gauge_color_rules) {
    model.gauge_color_rules.forEach((rule) => {
      if (rule.operator) {
        const value = getLastValue(series[0]?.data);
        if (shouldOperate(rule, value) && getOperator(rule.operator)(value, rule.value)) {
          gauge = rule.gauge;
          text = rule.text;
        }
      }
    });
  }
  return { text, gauge };
}

function GaugeVisualization(props) {
  const { backgroundColor, model, visData, fieldFormatMap, getConfig } = props;
  const colors = getColors(props);

  const series = get(visData, `${model.id}.series`, [])
    .filter((row) => row)
    .map((row, i) => {
      const seriesDef = model.series.find((s) => includes(row.id, s.id));
      const newProps = {};
      if (seriesDef) {
        const hasTextColorRules = model.gauge_color_rules.some(({ text }) => text);
        newProps.formatter =
          seriesDef.formatter === DATA_FORMATTERS.DEFAULT
            ? createFieldFormatter(
                getMetricsField(seriesDef.metrics),
                fieldFormatMap,
                'html',
                hasTextColorRules
              )
            : createTickFormatter(seriesDef.formatter, seriesDef.value_template, getConfig);
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
    initialRender: props.initialRender,
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

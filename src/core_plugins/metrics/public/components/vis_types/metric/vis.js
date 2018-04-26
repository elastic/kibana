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
      if (rule.opperator && rule.value != null) {
        const value = series[0] && getLastValue(series[0].data) || 0;
        if (_[rule.opperator](value, rule.value)) {
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
        newProps.formatter = tickFormatter(seriesDef.formatter, seriesDef.value_template);
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
  return (
    <div className="dashboard__visualization" style={style}>
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
  visData: PropTypes.object
};

export default visWithSplits(MetricVisualization);

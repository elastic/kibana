import React, { PropTypes } from 'react';
import tickFormatter from '../../lib/tick_formatter';
import _ from 'lodash';
import { Metric, getLastValue } from 'plugins/metrics/visualizations';
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
    reversed: props.reversed
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
  model: PropTypes.object,
  onBrush: PropTypes.func,
  onChange: PropTypes.func,
  reversed: PropTypes.bool,
  visData: PropTypes.object
};

export default MetricVisualization;

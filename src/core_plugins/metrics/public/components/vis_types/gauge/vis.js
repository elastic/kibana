import React, { PropTypes } from 'react';
import tickFormatter from '../../lib/tick_formatter';
import _ from 'lodash';
import { Gauge, getLastValue } from 'plugins/metrics/visualizations';
import color from 'color';

function getColors(props) {
  const { model, visData } = props;
  const series = _.get(visData, `${model.id}.series`, []);
  let text;
  let gauge;
  if (model.gauge_color_rules) {
    model.gauge_color_rules.forEach((rule) => {
      if (rule.opperator && rule.value != null) {
        const value = series[0] && getLastValue(series[0].data) || 0;
        if (_[rule.opperator](value, rule.value)) {
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
    .map((row, i) => {
      const seriesDef = model.series.find(s => _.includes(row.id, s.id));
      const newProps = {};
      if (seriesDef) {
        newProps.formatter = tickFormatter(seriesDef.formatter, seriesDef.value_template);
      }
      if (i === 0 && colors.gauge) newProps.color = colors.gauge;
      return _.assign({}, row, newProps);
    });
  const params = {
    metric: series[0],
    type: model.gauge_style || 'half',
    reversed: props.reversed
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
    <div className="dashboard__visualization" style={style}>
      <Gauge {...params} />
    </div>
  );
}

GaugeVisualization.propTypes = {
  backgroundColor: PropTypes.string,
  className: PropTypes.string,
  model: PropTypes.object,
  onBrush: PropTypes.func,
  onChange: PropTypes.func,
  reversed: PropTypes.bool,
  visData: PropTypes.object
};

export default GaugeVisualization;

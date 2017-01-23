import tickFormatter from '../../lib/tick_formatter';
import _ from 'lodash';
import { Metric, getLastValue } from 'plugins/metrics/visualizations';
import React from 'react';
import { findDOMNode } from 'react-dom';
import color from 'color';
function hasSeperateAxis(row) {
  return row.seperate_axis;
}

const formatLookup = {
  'bytes': '0.0b',
  'number': '0,0.[00]',
  'percent': '0.[00]%'
};

export default React.createClass({

  getColors() {
    const { model, visData } = this.props;
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
  },

  render() {
    const { backgroundColor, model, visData } = this.props;
    const colors = this.getColors();
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
    const props = {
      metric: series[0],
    };
    if (series[1]) {
      props.secondary = series[1];
    }

    const panelBackgroundColor = colors.background || backgroundColor;

    if (panelBackgroundColor && panelBackgroundColor !== 'inherit') {
      props.reversed = color(panelBackgroundColor).luminosity() < 0.45;
    }
    const style = { backgroundColor: panelBackgroundColor };
    return (
      <div className="dashboard__visualization" ref="metric" style={style}>
        <Metric {...props}/>
      </div>
    );
  }
});



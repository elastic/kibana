import tickFormatter from '../../../lib/tick_formatter';
import _ from 'lodash';
import { HalfGauge, CircleGauge, getLastValue } from '../../../visualizations/lib';
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
      if (i === 0 && colors.gauge) newProps.color = colors.gauge;
      return _.assign({}, row, newProps);
    });
    const props = {
      metric: series[0], };

    if (colors.text) {
      props.valueColor = colors.text;
    }

    if (model.gauge_width) props.gaugeLine = model.gauge_width;
    if (model.gauge_inner_color) props.innerColor = model.gauge_inner_color;
    if (model.gauge_inner_width) props.innerLine = model.gauge_inner_width;
    if (model.gauge_max != null) props.max = model.gauge_max;

    const panelBackgroundColor = model.background_color || backgroundColor;

    if (panelBackgroundColor && panelBackgroundColor !== 'inherit') {
      props.reversed = color(panelBackgroundColor).luminosity() < 0.45;
    }
    const style = { backgroundColor: panelBackgroundColor };
    let gauge;
    if (model.gauge_style === 'half') {
      gauge = (<HalfGauge {...props}/>);
    } else {
      gauge = (<CircleGauge {...props}/>);
    }
    return (
      <div className="dashboard__visualization" ref="metric" style={style}>
        { gauge }
      </div>
    );
  }
});



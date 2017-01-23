import tickFormatter from '../../lib/tick_formatter';
import _ from 'lodash';
import { TopN, getLastValue } from 'plugins/metrics/visualizations';
import React from 'react';
import { findDOMNode } from 'react-dom';
import { push } from 'react-router-redux';
import color from 'color';
import replaceVars from '../../lib/replace_vars';
function hasSeperateAxis(row) {
  return row.seperate_axis;
}

const formatLookup = {
  'bytes': '0.0b',
  'number': '0,0.[00]',
  'percent': '0.[00]%'
};

export default React.createClass({

  render() {
    const { backgroundColor, model, visData } = this.props;

    const series = _.get(visData, `${model.id}.series`, [])
      .map(item => {
        const id = _.first(item.id.split(/:/));
        const seriesConfig = model.series.find(s => s.id === id);
        if (seriesConfig) {
          const formatter = tickFormatter(seriesConfig.formatter, seriesConfig.value_template);
          const value = getLastValue(item.data, item.data.length);
          let color = seriesConfig.color;
          if (model.bar_color_rules) {
            model.bar_color_rules.forEach(rule => {
              if (rule.opperator && rule.value != null && rule.bar_color) {
                if (_[rule.opperator](value, rule.value)) {
                  color = rule.bar_color;
                }
              }
            });
          }
          return _.assign({}, item, {
            color,
            tickFormatter: formatter
          });
        }
        return item;
      });

    const props = { series: series };
    const panelBackgroundColor = model.background_color || backgroundColor;

    if (panelBackgroundColor && panelBackgroundColor !== 'inherit') {
      props.reversed = color(panelBackgroundColor).luminosity() < 0.45;
    }
    const style = { backgroundColor: panelBackgroundColor };
    return (
      <div className="dashboard__visualization" ref="metric" style={style}>
        <TopN {...props}/>
      </div>
    );
  }
});



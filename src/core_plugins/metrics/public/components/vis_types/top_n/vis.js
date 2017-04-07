import tickFormatter from '../../lib/tick_formatter';
import _ from 'lodash';
import { TopN, getLastValue } from 'plugins/metrics/visualizations';
import color from 'color';
import replaceVars from '../../lib/replace_vars';

import React, { PropTypes } from 'react';
function TopNVisualization(props) {
  const { backgroundColor, model, visData } = props;

  const series = _.get(visData, `${model.id}.series`, [])
    .map(item => {
      const id = _.first(item.id.split(/:/));
      const seriesConfig = model.series.find(s => s.id === id);
      if (seriesConfig) {
        const formatter = tickFormatter(seriesConfig.formatter, seriesConfig.value_template);
        const value = getLastValue(item.data, item.data.length);
        let color = item.color || seriesConfig.color;
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

  const params = {
    series: series,
    reversed: props.reversed
  };
  const panelBackgroundColor = model.background_color || backgroundColor;

  if (panelBackgroundColor && panelBackgroundColor !== 'inherit') {
    params.reversed = color(panelBackgroundColor).luminosity() < 0.45;
  }

  if (model.drilldown_url) {
    params.onClick = (item) => {
      window.location = replaceVars(model.drilldown_url, {}, { key: item.label });
    };
  }
  const style = { backgroundColor: panelBackgroundColor };
  return (
    <div className="dashboard__visualization" style={style}>
      <TopN {...params}/>
    </div>
  );

}

TopNVisualization.propTypes = {
  backgroundColor: PropTypes.string,
  className: PropTypes.string,
  model: PropTypes.object,
  onBrush: PropTypes.func,
  onChange: PropTypes.func,
  reversed: PropTypes.bool,
  visData: PropTypes.object
};

export default TopNVisualization;

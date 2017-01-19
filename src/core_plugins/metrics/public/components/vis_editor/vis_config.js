import React from 'react';
import timeseries from './panel_config/timeseries';
import metric from './panel_config/metric';
import topN from './panel_config/top_n';
import gauge from './panel_config/gauge';
import markdown from './panel_config/markdown';

const types = {
  timeseries,
  metric,
  top_n: topN,
  gauge,
  markdown
};

export default React.createClass({
  render() {
    const { model } = this.props;
    const component = types[model.type];
    if (component) {
      return React.createElement(component, this.props);
    }
    return (<div>Missing Panel Config for {model.type}</div>);
  }
});

import React from 'react';
import timeseries from './vis_config/timeseries';
import metric from './vis_config/metric';
import topN from './vis_config/top_n';
import gauge from './vis_config/gauge';
import markdown from './vis_config/markdown';

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
    return (<div>Missing Vis Config for {model.type}</div>);
  }
});

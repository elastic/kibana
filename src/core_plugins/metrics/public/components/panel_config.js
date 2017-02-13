import React, { PropTypes } from 'react';
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

function PanelConfig(props) {
  const { model } = props;
  const component = types[model.type];
  if (component) {
    return React.createElement(component, props);
  }
  return (<div>Missing panel config for "{model.type}"</div>);
}

PanelConfig.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  onChange: PropTypes.func,
  visData: PropTypes.object,
};

export default PanelConfig;

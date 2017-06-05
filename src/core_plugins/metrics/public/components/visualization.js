import React, { PropTypes } from 'react';
import _ from 'lodash';

import timeseries from './vis_types/timeseries/vis';
import metric from './vis_types/metric/vis';
import topN from './vis_types/top_n/vis';
import gauge from './vis_types/gauge/vis';
import markdown from './vis_types/markdown/vis';
import Error from './error';

const types = {
  timeseries,
  metric,
  top_n: topN,
  gauge,
  markdown
};

function Visualization(props) {
  const { visData, model } = props;
  // Show the error panel
  const error = _.get(visData, `${model.id}.error`);
  if (error) {
    return (
      <div className={props.className}>
        <Error error={error}/>
      </div>
    );
  }
  const component = types[model.type];
  if (component) {
    return React.createElement(component, {
      reversed: props.reversed,
      backgroundColor: props.backgroundColor,
      model: props.model,
      onBrush: props.onBrush,
      onChange: props.onChange,
      visData: props.visData
    });
  }
  return (<div className={props.className}></div>);
}

Visualization.defaultProps = {
  className: 'thor__visualization'
};

Visualization.propTypes = {
  backgroundColor: PropTypes.string,
  className: PropTypes.string,
  model: PropTypes.object,
  onBrush: PropTypes.func,
  onChange: PropTypes.func,
  reversed: PropTypes.bool,
  visData: PropTypes.object
};

export default Visualization;

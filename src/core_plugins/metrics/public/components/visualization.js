import React from 'react';
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

export default React.createClass({

  getDefaultProps() {
    return { className: 'thor__visualization' };
  },

  render() {
    const { visData, model } = this.props;

    // Show the error panel
    const error = _.get(visData, `${model.id}.error`);
    if (error) {
      return (
        <div className={this.props.className}>
          <Error error={error}/>
        </div>
      );
    }

    const component = types[model.type];
    if (component) {
      return React.createElement(component, this.props);
    }
    return (<div className={this.props.className}></div>);
  }
});

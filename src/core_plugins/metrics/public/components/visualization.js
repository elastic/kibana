import PropTypes from 'prop-types';
import React from 'react';
import _ from 'lodash';

import timeseries from './vis_types/timeseries/vis';
import metric from './vis_types/metric/vis';
import topN from './vis_types/top_n/vis';
import table from './vis_types/table/vis';
import gauge from './vis_types/gauge/vis';
import markdown from './vis_types/markdown/vis';
import Error from './error';
import NoData from './no_data';

const types = {
  timeseries,
  metric,
  top_n: topN,
  table,
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
        <Error error={error} />
      </div>
    );
  }

  const path = visData.type === 'table' ? 'series' : `${model.id}.series`;
  const noData = _.get(visData, path, []).length === 0;
  if (noData) {
    return (
      <div className={props.className}>
        <NoData />
      </div>
    );
  }

  const component = types[model.type];
  if (component) {
    return React.createElement(component, {
      dateFormat: props.dateFormat,
      reversed: props.reversed,
      backgroundColor: props.backgroundColor,
      model: props.model,
      onBrush: props.onBrush,
      onChange: props.onChange,
      onUiState: props.onUiState,
      uiState: props.uiState,
      visData: visData.type === model.type ? visData : {}
    });
  }
  return <div className={props.className} />;
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
  onUiState: PropTypes.func,
  uiState: PropTypes.object,
  reversed: PropTypes.bool,
  visData: PropTypes.object,
  dateFormat: PropTypes.string
};

export default Visualization;

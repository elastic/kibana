/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import PropTypes from 'prop-types';
import React from 'react';
import _ from 'lodash';

import { TimeseriesVisualization } from './vis_types/timeseries/vis';
import { metric } from './vis_types/metric/vis';
import { TopNVisualization as topN } from './vis_types/top_n/vis';
import { TableVis as table } from './vis_types/table/vis';
import { gauge } from './vis_types/gauge/vis';
import { MarkdownVisualization as markdown } from './vis_types/markdown/vis';
import { ErrorComponent } from './error';
import { NoDataComponent } from './no_data';

const types = {
  timeseries: TimeseriesVisualization,
  metric,
  top_n: topN,
  table,
  gauge,
  markdown,
};

export function Visualization(props) {
  const { visData, model } = props;
  // Show the error panel
  const error = _.get(visData, `${model.id}.error`);
  if (error) {
    return (
      <div className={props.className}>
        <ErrorComponent error={error} />
      </div>
    );
  }

  const path = visData.type === 'table' ? 'series' : `${model.id}.series`;
  const noData = _.get(visData, path, []).length === 0;
  if (noData) {
    return (
      <div className={props.className}>
        <NoDataComponent />
      </div>
    );
  }

  const component = types[model.type];
  if (component) {
    return React.createElement(component, {
      dateFormat: props.dateFormat,
      backgroundColor: props.backgroundColor,
      model: props.model,
      onBrush: props.onBrush,
      onChange: props.onChange,
      onUiState: props.onUiState,
      uiState: props.uiState,
      visData: visData.type === model.type ? visData : {},
      getConfig: props.getConfig,
    });
  }
  return <div className={props.className} />;
}

Visualization.propTypes = {
  backgroundColor: PropTypes.string,
  className: PropTypes.string,
  model: PropTypes.object,
  onBrush: PropTypes.func,
  onChange: PropTypes.func,
  onUiState: PropTypes.func,
  uiState: PropTypes.object,
  visData: PropTypes.object,
  dateFormat: PropTypes.string,
  getConfig: PropTypes.func,
};

Visualization.defaultProps = {
  className: 'tvbVis',
};

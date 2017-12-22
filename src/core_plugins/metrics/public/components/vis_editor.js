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
import React, { Component } from 'react';
import VisEditorVisualization from './vis_editor_visualization';
import Visualization from './visualization';
import VisPicker from './vis_picker';
import PanelConfig from './panel_config';
import brushHandler from '../lib/create_brush_handler';
import { get } from 'lodash';
import { hasPipelineAggregation } from './lib/check_timeseries_pipelines';
import { ModalConfirm } from './modal_confirm';
import { removeTimeseriesMetrics } from './lib/remove_timeseries_metrics';
import { metricTypes } from '../../common/metric_types';

class VisEditor extends Component {
  constructor(props) {
    super(props);
    const { vis } = props;
    this.appState = vis.API.getAppState();
    const reversed = get(this.appState, 'options.darkTheme', false);
    this.state = {
      model: props.vis.params,
      dirty: false,
      autoApply: true,
      reversed,
      showConfirm: false,
    };
    this.onBrush = brushHandler(props.vis.API.timeFilter);
    this.handleUiState = this.handleUiState.bind(this, props.vis);
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
    this.getConfig = (...args) => props.config.get(...args);
  }

  handleUiState(vis, ...args) {
    vis.uiStateVal(...args);
  }

  componentWillMount() {
    if (this.appState) {
      this.appState.on('save_with_changes', this.handleAppStateChange);
    }
  }

  handleAppStateChange() {
    const reversed = get(this.appState, 'options.darkTheme', false);
    this.setState({ reversed });
  }

  componentWillUnmount() {
    if (this.appState) {
      this.appState.off('save_with_changes', this.handleAppStateChange);
    }
  }

  testTimespanMode = part => {
    const { model } = this.state;
    const timerangeMode = part.timerange_mode || model.timerange_mode;
    const type = part.type || model.type;
    const modeIsAll =
      timerangeMode && timerangeMode === 'all' && metricTypes.includes(type);
    const series = part.series || model.series;
    const containsPipelines = series.some(hasPipelineAggregation);
    if (modeIsAll && containsPipelines) {
      this.setState({ showConfirm: true, nextPart: part });
      return false;
    }
    return true;
  };

  handleChange = part => {
    if (this.testTimespanMode(part)) {
      const nextModel = { ...this.state.model, ...part };
      this.props.vis.params = nextModel;
      if (this.state.autoApply) {
        this.props.vis.updateState();
      }
      this.setState({ model: nextModel, dirty: !this.state.autoApply });
    }
  };

  handleAutoApplyToggle = part => {
    this.setState({ autoApply: part.target.checked });
  };

  handleCommit = () => {
    this.props.vis.updateState();
    this.setState({ dirty: false });
  };

  handleCancel = () => {
    this.handleChange(this.state.nextPart);
    this.setState({ showConfirm: false, nextPart: {} });
  };

  handleConfirm = () => {
    const nextPart = {
      series: removeTimeseriesMetrics(this.state.model.series),
      ...this.state.nextPart,
    };
    this.handleChange(nextPart);
    this.setState({ showConfirm: false, nextPart: {} });
  };
  render() {
    if (!this.props.isEditorMode) {
      if (!this.props.vis.params || !this.props.visData) return null;
      const reversed = this.state.reversed;
      return (
        <Visualization
          dateFormat={this.props.config.get('dateFormat')}
          reversed={reversed}
          onBrush={this.onBrush}
          onUiState={this.handleUiState}
          uiState={this.props.vis.getUiState()}
          fields={this.props.vis.fields}
          model={this.props.vis.params}
          visData={this.props.visData}
          getConfig={this.getConfig}
        />
      );
    }

    const { model } = this.state;

    if (model && this.props.visData) {
      return (
        <div className="vis_editor">
          <div className="vis-editor-hide-for-reporting">
            <VisPicker model={model} onChange={this.handleChange} />
          </div>
          <VisEditorVisualization
            dirty={this.state.dirty}
            autoApply={this.state.autoApply}
            model={model}
            appState={this.appState}
            savedObj={this.props.savedObj}
            timeRange={this.props.timeRange}
            onUiState={this.handleUiState}
            uiState={this.props.vis.getUiState()}
            onBrush={this.onBrush}
            onCommit={this.handleCommit}
            onToggleAutoApply={this.handleAutoApplyToggle}
            onChange={this.handleChange}
            title={this.props.vis.title}
            description={this.props.vis.description}
            dateFormat={this.props.config.get('dateFormat')}
          />
          <div className="vis-editor-hide-for-reporting">
            <PanelConfig
              fields={this.props.vis.fields}
              model={model}
              visData={this.props.visData}
              dateFormat={this.props.config.get('dateFormat')}
              getConfig={this.getConfig}
              onChange={this.handleChange}
            />
          </div>
          <ModalConfirm
            show={this.state.showConfirm}
            onConfirm={this.handleConfirm}
            onCancel={this.handleCancel}
            title="Incompatible Metrics"
            confirmButtonText="Remove Metrics"
            cancelButtonText="Keep"
            message={
              <div>
                <p>
                  The <strong>data timerange mode</strong> you have chosen is
                  not compatible with some of the metrics you have configured.
                  If you proceed the incompatible metrics will be removed.
                </p>
                <p>Remove incompatible metrics?</p>
              </div>
            }
          />
        </div>
      );
    }

    return null;
  }

  componentDidMount() {
    this.props.renderComplete();
  }

  componentDidUpdate() {
    this.props.renderComplete();
  }
}

VisEditor.defaultProps = {
  visData: {},
};

VisEditor.propTypes = {
  vis: PropTypes.object,
  visData: PropTypes.object,
  renderComplete: PropTypes.func,
  config: PropTypes.object,
  isEditorMode: PropTypes.bool,
  savedObj: PropTypes.object,
  timeRange: PropTypes.object,
};

export default VisEditor;

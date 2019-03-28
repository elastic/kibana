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
import * as Rx from 'rxjs';
import { share } from 'rxjs/operators';
import VisEditorVisualization from './vis_editor_visualization';
import Visualization from './visualization';
import VisPicker from './vis_picker';
import PanelConfig from './panel_config';
import brushHandler from '../lib/create_brush_handler';
import { fetchIndexPatternFields } from '../lib/fetch_fields';

class VisEditor extends Component {
  constructor(props) {
    super(props);
    const { vis } = props;
    this.appState = vis.API.getAppState();
    this.state = {
      model: props.visParams,
      dirty: false,
      autoApply: true,
      visFields: props.visFields
    };
    this.onBrush = brushHandler(props.vis.API.timeFilter);
    this.visDataSubject = new Rx.Subject();
    this.visData$ = this.visDataSubject.asObservable().pipe(share());
  }

  get uiState() {
    return this.props.vis.getUiState();
  }

  getConfig = (...args) => {
    return this.props.config.get(...args);
  };

  handleUiState = (field, value) =>  {
    this.props.vis.uiStateVal(field, value);
  };

  handleChange = async (partialModel) => {
    const nextModel = { ...this.state.model, ...partialModel };
    this.props.vis.params = nextModel;
    if (this.state.autoApply) {
      this.props.vis.updateState();
    }
    this.setState({
      model: nextModel,
      dirty: !this.state.autoApply
    });
    const { params, fields } = this.props.vis;
    fetchIndexPatternFields(params, fields).then(visFields => {
      this.setState({ visFields });
    });
  };

  handleCommit = () => {
    this.props.vis.updateState();
    this.setState({ dirty: false });
  };

  handleAutoApplyToggle = (event) => {
    this.setState({ autoApply: event.target.checked });
  };

  onDataChange = ({ visData }) => {
    this.visDataSubject.next(visData);
  };

  render() {
    if (!this.props.isEditorMode) {
      if (!this.props.visParams || !this.props.visData) {
        return null;
      }
      return (
        <Visualization
          dateFormat={this.props.config.get('dateFormat')}
          onBrush={this.onBrush}
          onUiState={this.handleUiState}
          uiState={this.uiState}
          model={this.props.visParams}
          visData={this.props.visData}
          getConfig={this.getConfig}
        />
      );
    }

    const { model } = this.state;

    if (model) {
      return (
        <div className="tvbEditor">
          <div className="tvbEditor--hideForReporting">
            <VisPicker model={model} onChange={this.handleChange} />
          </div>
          <VisEditorVisualization
            dirty={this.state.dirty}
            autoApply={this.state.autoApply}
            model={model}
            appState={this.appState}
            savedObj={this.props.savedObj}
            timeRange={this.props.timeRange}
            uiState={this.uiState}
            onCommit={this.handleCommit}
            onToggleAutoApply={this.handleAutoApplyToggle}
            title={this.props.vis.title}
            description={this.props.vis.description}
            onDataChange={this.onDataChange}
          />
          <div className="tvbEditor--hideForReporting">
            <PanelConfig
              fields={this.state.visFields}
              model={model}
              visData$={this.visData$}
              dateFormat={this.props.config.get('dateFormat')}
              onChange={this.handleChange}
              getConfig={this.getConfig}
            />
          </div>
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
  visData: {}
};

VisEditor.propTypes = {
  vis: PropTypes.object,
  visData: PropTypes.object,
  visFields: PropTypes.object,
  renderComplete: PropTypes.func,
  config: PropTypes.object,
  isEditorMode: PropTypes.bool,
  savedObj: PropTypes.object,
  timeRange: PropTypes.object,
};

export default VisEditor;

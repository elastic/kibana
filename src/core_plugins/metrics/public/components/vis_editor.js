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
import { extractIndexPatterns } from '../lib/extract_index_patterns';
import { fetchFields } from '../lib/fetch_fields';
import chrome from 'ui/chrome';

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
      visFields: {},
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

  isIndexPatternChanged = () => {
    if (this.state.model.index_pattern !== this.props.vis.params.index_pattern) {
      return true;
    }
    const annotations = new Set(this.props.vis.params.annotations.map(annotation => annotation.index_pattern));
    const stateAnnotations = new Set(this.state.model.annotations.map(annotation => annotation.index_pattern));
    const diff = [...annotations].filter(a => !stateAnnotations.has(a));
    return diff.length !== 0;
  }

  async fetchIndexPatternFields(vis) {
    if (vis.params.index_pattern === '') {
      // set the default index pattern if none is defined.
      const savedObjectsClient = chrome.getSavedObjectsClient();
      const indexPattern = await savedObjectsClient.get('index-pattern', this.getConfig('defaultIndex'));
      const defaultIndexPattern = indexPattern.attributes.title;
      vis.params.index_pattern = defaultIndexPattern;
    }
    const indexPatterns = extractIndexPatterns(vis);
    const fields = await fetchFields(indexPatterns);
    return fields;
  }

  handleChange = async (part) => {
    const nextModel = { ...this.state.model, ...part };
    this.props.vis.params = nextModel;
    if (this.state.autoApply) {
      this.props.vis.updateState();
    }
    let visFields = this.state.visFields;
    if (this.isIndexPatternChanged()) {
      const fields = await this.fetchIndexPatternFields(this.props.vis);
      visFields = {
        ...this.state.visFields,
        ...fields,
      };
    }
    this.setState({
      model: nextModel,
      dirty: !this.state.autoApply,
      visFields,
    });
  }

  handleCommit = () => {
    this.props.vis.updateState();
    this.setState({ dirty: false });
  }

  handleAutoApplyToggle = (part) => {
    this.setState({ autoApply: part.target.checked });
  }

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
          fields={this.state.visFields}
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
              fields={this.state.visFields}
              model={model}
              visData={this.props.visData}
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

  async componentDidMount() {
    const fields = await this.fetchIndexPatternFields(this.props.vis);
    this.setState({
      visFields: {
        ...this.state.visFields,
        ...fields,
      }
    });
    this.props.renderComplete('mount');
  }

  componentDidUpdate() {
    this.props.renderComplete('updated');
  }
}

VisEditor.defaultProps = {
  visData: {}
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

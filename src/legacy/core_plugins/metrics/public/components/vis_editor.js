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
import { extractIndexPatterns } from '../lib/extract_index_patterns';
import { fetchFields } from '../lib/fetch_fields';
import chrome from 'ui/chrome';
import { I18nProvider } from '@kbn/i18n/react';

class VisEditor extends Component {
  constructor(props) {
    super(props);
    const { vis } = props;
    this.appState = vis.API.getAppState();
    this.state = {
      model: props.vis.params,
      dirty: false,
      autoApply: true,
      visFields: {},
    };
    this.onBrush = brushHandler(props.vis.API.timeFilter);
    this.handleUiState = this.handleUiState.bind(this, props.vis);
    this.getConfig = this.getConfig.bind(this);
    this.visDataSubject = new Rx.Subject();
    this.visData$ = this.visDataSubject.asObservable().pipe(share());
  }

  getConfig(...args) {
    return this.props.config.get(...args);
  }

  handleUiState(vis, ...args) {
    vis.uiStateVal(...args);
  }

  fetchIndexPatternFields = async () => {
    const { params } = this.props.vis;
    const { visFields } = this.state;
    const indexPatterns = extractIndexPatterns(params, visFields);
    const fields = await fetchFields(indexPatterns);
    this.setState((previousState) => {
      return {
        visFields: {
          ...previousState.visFields,
          ...fields,
        }
      };
    });
  }

  setDefaultIndexPattern = async () => {
    if (this.props.vis.params.index_pattern === '') {
      // set the default index pattern if none is defined.
      const savedObjectsClient = chrome.getSavedObjectsClient();
      const indexPattern = await savedObjectsClient.get('index-pattern', this.getConfig('defaultIndex'));
      const defaultIndexPattern = indexPattern.attributes.title;
      this.props.vis.params.index_pattern = defaultIndexPattern;
    }
  }

  handleChange = async (partialModel) => {
    const nextModel = { ...this.state.model, ...partialModel };
    this.props.vis.params = nextModel;
    if (this.state.autoApply) {
      this.props.vis.updateState();
    }
    this.setState({
      model: nextModel,
      dirty: !this.state.autoApply,
    });
    this.fetchIndexPatternFields();
  }

  handleCommit = () => {
    this.props.vis.updateState();
    this.setState({ dirty: false });
  }

  handleAutoApplyToggle = (event) => {
    this.setState({ autoApply: event.target.checked });
  }

  onDataChange = (data) => {
    this.visDataSubject.next(data);
  }

  render() {
    if (!this.props.isEditorMode) {
      if (!this.props.vis.params || !this.props.visData) {
        return null;
      }
      return (
        <I18nProvider>
          <Visualization
            dateFormat={this.props.config.get('dateFormat')}
            reversed={false}
            onBrush={this.onBrush}
            onUiState={this.handleUiState}
            uiState={this.props.vis.getUiState()}
            fields={this.state.visFields}
            model={this.props.vis.params}
            visData={this.props.visData}
            getConfig={this.getConfig}
          />
        </I18nProvider>
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
            onUiState={this.handleUiState}
            uiState={this.props.vis.getUiState()}
            onBrush={this.onBrush}
            onCommit={this.handleCommit}
            onToggleAutoApply={this.handleAutoApplyToggle}
            onChange={this.handleChange}
            title={this.props.vis.title}
            description={this.props.vis.description}
            dateFormat={this.props.config.get('dateFormat')}
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

  async componentDidMount() {
    await this.setDefaultIndexPattern();
    await this.fetchIndexPatternFields();
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
  renderComplete: PropTypes.func,
  config: PropTypes.object,
  isEditorMode: PropTypes.bool,
  savedObj: PropTypes.object,
  timeRange: PropTypes.object,
};

export default VisEditor;

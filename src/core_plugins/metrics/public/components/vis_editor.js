import PropTypes from 'prop-types';
import React, { Component } from 'react';
import VisEditorVisualization from './vis_editor_visualization';
import Visualization from './visualization';
import VisPicker from './vis_picker';
import PanelConfig from './panel_config';
import brushHandler from '../lib/create_brush_handler';
import { get } from 'lodash';

class VisEditor extends Component {
  constructor(props) {
    super(props);
    const { appState } = props;
    const reversed = get(appState, 'options.darkTheme', false);
    this.state = { model: props.vis.params, dirty: false, autoApply: true, reversed };
    this.onBrush = brushHandler(props.vis.API.timeFilter);
    this.handleUiState = this.handleUiState.bind(this, props.vis);
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
  }

  handleUiState(vis, ...args) {
    vis.uiStateVal(...args);
  }

  componentWillMount() {
    const { appState } = this.props;
    if (appState) {
      this.appState = appState;
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

  render() {
    const handleChange = (part) => {
      const nextModel = { ...this.state.model, ...part };

      this.props.vis.params = nextModel;
      if (this.state.autoApply) {
        this.props.vis.updateState();
      }

      this.setState({ model: nextModel, dirty: !this.state.autoApply });
    };

    const handleAutoApplyToggle = (part) => {
      this.setState({ autoApply: part.target.checked });
    };

    const handleCommit = () => {
      this.props.vis.updateState();
      this.setState({ dirty: false });
    };

    if (!this.props.vis.isEditorMode()) {
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
        />
      );
    }

    const { model } = this.state;

    if (model && this.props.visData) {
      return (
        <div className="vis_editor">
          <div className="vis-editor-hide-for-reporting">
            <VisPicker model={model} onChange={handleChange} />
          </div>
          <VisEditorVisualization
            dirty={this.state.dirty}
            autoApply={this.state.autoApply}
            model={model}
            visData={this.props.visData}
            onUiState={this.handleUiState}
            uiState={this.props.vis.getUiState()}
            onBrush={this.onBrush}
            onCommit={handleCommit}
            onToggleAutoApply={handleAutoApplyToggle}
            onChange={handleChange}
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
              onChange={handleChange}
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
  appState: PropTypes.object,
  renderComplete: PropTypes.func,
  config: PropTypes.object
};

export default VisEditor;

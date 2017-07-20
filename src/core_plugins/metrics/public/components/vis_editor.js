import React, { Component, PropTypes } from 'react';
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
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
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
      const reversed = this.state.reversed;
      return (
        <Visualization
          reversed={reversed}
          onBrush={this.onBrush}
          fields={this.props.vis.fields}
          model={this.props.vis.params}
          visData={this.props.visData} />
      );
    }


    const { model } = this.state;

    if (model) {
      return (
        <div className="vis_editor">
          <VisPicker
            model={model}
            onChange={handleChange} />
          <VisEditorVisualization
            dirty={this.state.dirty}
            autoApply={this.state.autoApply}
            model={model}
            visData={this.props.visData}
            onBrush={this.onBrush}
            onCommit={handleCommit}
            onToggleAutoApply={handleAutoApplyToggle}
            onChange={handleChange} />
          <PanelConfig
            fields={this.props.vis.fields}
            model={model}
            visData={this.props.visData}
            onChange={handleChange} />
        </div>
      );
    }

    return null;
  }

  componentDidMount() {
    this.props.renderComplete();
  }

}

VisEditor.propTypes = {
  vis: PropTypes.object,
  visData: PropTypes.object,
  appState: PropTypes.object,
  renderComplete: PropTypes.func,
};

export default VisEditor;

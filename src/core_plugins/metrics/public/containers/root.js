import PropTypes from 'prop-types';
import React, { Component } from 'react';
import VisEditorVisualization from '../components/vis_editor_visualization';
import Visualization from '../components/visualization';
import VisPicker from '../components/vis_picker';
import PanelConfig from '../components/panel_config';
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

  handleChange = part => {
    const nextModel = { ...this.state.model, ...part };

    this.props.vis.params = nextModel;
    if (this.state.autoApply) {
      this.props.vis.updateState();
    }

    this.setState({ model: nextModel, dirty: !this.state.autoApply });
  };

  render() {
    const handleAutoApplyToggle = part => {
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
          <VisPicker model={model} onChange={this.handleChange} />
          <VisEditorVisualization
            dirty={this.state.dirty}
            autoApply={this.state.autoApply}
            model={model}
            visData={this.props.visData}
            onBrush={this.onBrush}
            onCommit={handleCommit}
            onToggleAutoApply={handleAutoApplyToggle}
            onChange={this.handleChange}
            dateFormat={this.props.config.get('dateFormat')}
          />
          <PanelConfig
            fields={this.props.vis.fields}
            model={model}
            visData={this.props.visData}
            dateFormat={this.props.config.get('dateFormat')}
            onChange={this.handleChange}
          />
        </div>
      );
    }

    return null;
  }

  componentDidMount() {
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

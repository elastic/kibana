import React, { Component, PropTypes } from 'react';
import VisEditorVisualization from './vis_editor_visualization';
import Visualization from './visualization';
import VisPicker from './vis_picker';
import PanelConfig from './panel_config';
import brushHandler from '../lib/create_brush_handler';

class VisEditor extends Component {

  constructor(props) {
    super(props);
    this.state = { model: props.vis.params, dirty: false, autoApply: true };
    this.onBrush = brushHandler(props.vis.API.timeFilter);
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
      return (
        <Visualization
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
  fields: PropTypes.object,
  model: PropTypes.object,
  onBrush: PropTypes.func,
  onChange: PropTypes.func,
  onCommit: PropTypes.func,
  onToggleAutoApply: PropTypes.func,
  visData: PropTypes.object,
  dirty: PropTypes.bool,
  autoApply: PropTypes.bool
};

export default VisEditor;

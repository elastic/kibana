import React, { Component, PropTypes } from 'react';
import VisEditorVisualization from './vis_editor_visualization';
import Visualization from './visualization';
import VisPicker from './vis_picker';
import PanelConfig from './panel_config';
import brushHandler from '../lib/create_brush_handler';

class VisEditor extends Component {

  constructor(props) {
    super(props);
    this.state = { model: props.vis.params };
    this.onBrush = brushHandler(props.vis.API.timeFilter);
  }

  render() {
    const handleChange = (part) => {
      const nextModel = { ...this.state.model, ...part };
      this.setState({ model: nextModel });
      if (this.props.onChange || true) {
        console.log(nextModel);
        this.props.vis.params = nextModel;
        this.props.vis.updateState();
        //this.props.onChange(nextModel);
      }
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
            dirty={this.props.dirty}
            autoApply={this.props.autoApply}
            model={model}
            visData={this.props.visData}
            onBrush={this.onBrush}
            onCommit={this.props.onCommit}
            onToggleAutoApply={this.props.onToggleAutoApply}
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

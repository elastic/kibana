import React, { Component, PropTypes } from 'react';
import VisEditorVisualization from './vis_editor_visualization';
import Visualization from './visualization';
import VisPicker from './vis_picker';
import PanelConfig from './panel_config';

class VisEditor extends Component {

  constructor(props) {
    super(props);
    this.state = { model: props.model };
  }

  render() {
    const handleChange = (part) => {
      const nextModel = { ...this.state.model, ...part };
      this.setState({ model: nextModel });
      if (this.props.onChange) {
        this.props.onChange(nextModel);
      }
    };

    if (this.props.embedded) {
      return (
        <Visualization
          fields={this.props.fields}
          model={this.props.model}
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
            onBrush={this.props.onBrush}
            onCommit={this.props.onCommit}
            onToggleAutoApply={this.props.onToggleAutoApply}
            onChange={handleChange} />
          <PanelConfig
            fields={this.props.fields}
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

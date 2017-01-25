import React, { PropTypes } from 'react';
import VisEditorVisualization from './vis_editor_visualization';
import VisPicker from './vis_picker';
import PanelConfig from './panel_config';

function VisEditor(props) {
  const handleChange = (part) => {
    if (props.onChange) {
      props.onChange(Object.assign({}, props.model, part));
    }
  };

  if (props.model) {
    return (
      <div className="vis_editor">
        <VisPicker
          model={props.model}
          onChange={handleChange} />
        <VisEditorVisualization
          model={props.model}
          visData={props.visData}
          onBrush={props.onBrush}
          onChange={handleChange} />
        <PanelConfig
          fields={props.fields}
          model={props.model}
          visData={props.visData}
          onChange={handleChange} />
      </div>
    );
  }
  return null;
}

VisEditor.propTypes = {
  fields   : PropTypes.object,
  model    : PropTypes.object,
  onBrush  : PropTypes.func,
  onChange : PropTypes.func,
  visData  : PropTypes.object
};

export default VisEditor;

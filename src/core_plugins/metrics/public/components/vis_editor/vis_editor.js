import React from 'react';
import _ from 'lodash';
import SeriesEditor from './series_editor';
import VisEditorVisualization from './vis_editor_visualization';
import VisPicker from './vis_picker';
import PanelConfig from './panel_config';
import replaceVars from '../../lib/replace_vars';
export default React.createClass({

  handleChange(part) {
    if (this.props.onChange) {
      this.props.onChange(_.assign({}, this.props.model, part));
    }
  },

  render() {
    if (this.props.model) {
      return (
        <div className="vis_editor">
          <VisPicker
            {...this.props}
            onChange={this.handleChange} />
          <VisEditorVisualization
            {...this.props}
            onChange={this.handleChange} />
          <PanelConfig
            {...this.props}
            onChange={this.handleChange} />
        </div>
      );
    }
    return null;
  }
});

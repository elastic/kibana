/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
// The color picker is not yet accessible.

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Tooltip from './tooltip';
import { KuiColorPicker } from 'ui_framework/components';

class ColorPicker extends Component {
  constructor(props) {
    super(props);
    this.state = {
      color: {}
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleClear = this.handleClear.bind(this);
  }

  handleChange(color) {
    if (this.props.onChange) this.props.onChange({ [this.props.name]: color });
  }

  handleClear() {
    this.props.onChange({
      [this.props.name]: null
    });
  }

  render() {
    const { value, disableTrash } = this.props;

    return (
      <span>
        {!disableTrash && (
          <div className="vis_editor__color_picker-clear" onClick={this.handleClear}>
            <Tooltip text="Clear">
              <i className="fa fa-ban" />
            </Tooltip>
          </div>
        )}
        <KuiColorPicker onChange={this.handleChange} color={value} showColorLabel={false} />
      </span>
    );
  }
}

ColorPicker.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  disableTrash: PropTypes.bool,
  onChange: PropTypes.func
};

export default ColorPicker;

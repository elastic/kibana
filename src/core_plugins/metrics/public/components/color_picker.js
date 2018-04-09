/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
// The color picker is not yet accessible.

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { EuiToolTip, } from '@elastic/eui';
import Picker from './custom_color_picker';

class ColorPicker extends Component {

  constructor(props) {
    super(props);
    this.state = {
      displayPlicker: false,
      color: {}
    };

    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleClear = this.handleClear.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  handleChange(color) {
    const { rgb } = color;
    const part = {};
    part[this.props.name] = `rgba(${rgb.r},${rgb.g},${rgb.b},${rgb.a})`;
    if (this.props.onChange) this.props.onChange(part);
  }

  handleClick() {
    this.setState({ displayPicker: !this.state.displayColorPicker });
  }

  handleClose() {
    this.setState({ displayPicker: false });
  }

  handleClear() {
    const part = {};
    part[this.props.name] = null;
    this.props.onChange(part);
  }

  renderSwatch() {
    if (!this.props.value) {
      return (
        <button
          aria-label="Color picker, not accessible"
          className="vis_editor__color_picker-swatch-empty"
          onClick={this.handleClick}
        />
      );
    }
    return (
      <button
        aria-label={`Color picker ({this.props.value}), not accessible`}
        style={{ backgroundColor: this.props.value }}
        className="vis_editor__color_picker-swatch"
        onClick={this.handleClick}
      />
    );
  }

  render() {
    const swatch = this.renderSwatch();
    const value = this.props.value || undefined;
    let clear;
    if (!this.props.disableTrash) {
      clear = (
        <div className="vis_editor__color_picker-clear" onClick={this.handleClear}>
          <EuiToolTip content="Clear">
            <i className="fa fa-ban"/>
          </EuiToolTip>
        </div>
      );
    }
    return (
      <div className="vis_editor__color_picker">
        { swatch }
        { clear }
        {
          this.state.displayPicker
            ? (
              <div className="vis_editor__color_picker-popover">
                <div
                  className="vis_editor__color_picker-cover"
                  onClick={this.handleClose}
                />
                <Picker
                  color={value}
                  onChangeComplete={this.handleChange}
                />
              </div>
            ) : null
        }
      </div>
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

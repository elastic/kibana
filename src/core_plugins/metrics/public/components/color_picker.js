import React, { Component, PropTypes } from 'react';
import Tooltip from './tooltip';
import CustomColorPicker from './custom_color_picker';
const Picker = CustomColorPicker;

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
        <div
          className="vis_editor__color_picker-swatch-empty"
          onClick={this.handleClick}/>
      );
    }
    return (
      <div
        style={{ backgroundColor: this.props.value }}
        className="vis_editor__color_picker-swatch"
        onClick={this.handleClick}/>
    );
  }

  render() {
    const swatch = this.renderSwatch();
    const value = this.props.value || undefined;
    let clear;
    if (!this.props.disableTrash) {
      clear = (
        <div className="vis_editor__color_picker-clear" onClick={this.handleClear}>
          <Tooltip text="Clear">
            <i className="fa fa-ban"/>
          </Tooltip>
        </div>
      );
    }
    return (
      <div className="vis_editor__color_picker">
        { swatch }
        { clear }
        { this.state.displayPicker ? <div className="vis_editor__color_picker-popover">
          <div className="vis_editor__color_picker-cover"
            onClick={this.handleClose}/>
          <Picker
            color={ value }
            onChangeComplete={this.handleChange} />
        </div> : null }
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

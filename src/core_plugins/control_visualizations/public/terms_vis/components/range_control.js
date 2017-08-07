import React, { Component, PropTypes } from 'react';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';

export class RangeControl extends Component {
  constructor(props) {
    super(props);

    this.state = {
      sliderValue: this.props.control.value
    };

    this.handleOnChange = this.handleOnChange.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ sliderValue: nextProps.control.value });
  }

  handleOnChange(control, value) {
    this.props.stageFilter(this.props.controlIndex, value, this.props.control.filterManager.createFilter(value));
  }

  render() {
    return (
      <div className="input-control range-control">
        <span>{this.props.control.label}</span>
        <InputRange
          maxValue={this.props.control.max}
          minValue={this.props.control.min}
          step={this.props.control.options.step}
          value={this.state.sliderValue}
          onChange={newValue => this.setState({ sliderValue: newValue })}
          onChangeComplete={this.handleOnChange.bind(null, this.props.control)}
        />
      </div>
    );
  }
}

RangeControl.propTypes = {
  control: PropTypes.object.isRequired,
  controlIndex: PropTypes.number.isRequired,
  stageFilter: PropTypes.func.isRequired
};

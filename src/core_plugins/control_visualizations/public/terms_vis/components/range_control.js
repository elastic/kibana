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
    const range = {
      gte: value.min,
      lt: value.max
    };
    this.props.setFilter(control.filterManager, range);
  }

  render() {
    return (
      <div className="input-control range-control">
        <span>{this.props.control.label}</span>
        <InputRange
          maxValue={this.props.control.max}
          minValue={this.props.control.min}
          value={this.state.sliderValue}
          onChange={newValue => this.setState({ sliderValue: newValue })}
          onChangeComplete={this.handleOnChange.bind(null, this.props.control)}
        />
      </div>
    );
  }
}

RangeControl.propTypes = {
  setFilter: PropTypes.func.isRequired,
  removeFilter: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired
};

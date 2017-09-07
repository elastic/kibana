import _  from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import InputRange from 'react-input-range';
import { FormRow } from './form_row';

export class RangeControl extends Component {
  constructor(props) {
    super(props);

    this.state = {
      sliderValue: this.props.control.value
    };

    this.formatLabel = this.formatLabel.bind(this);
    this.handleOnChange = this.handleOnChange.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ sliderValue: nextProps.control.value });
  }

  handleOnChange(control, value) {
    this.props.stageFilter(this.props.controlIndex, value, this.props.control.filterManager.createFilter(value));
  }

  formatLabel(value) {
    let formatedValue = value;
    const decimalPlaces = _.get(this.props, 'control.options.decimalPlaces');
    if (decimalPlaces !== null && decimalPlaces >= 0) {
      formatedValue = value.toFixed(decimalPlaces);
    }
    return formatedValue;
  }

  render() {
    return (
      <FormRow
        id={this.props.control.id}
        label={this.props.control.label}
      >
        <div className="inputRangeContainer">
          <InputRange
            maxValue={this.props.control.max}
            minValue={this.props.control.min}
            step={this.props.control.options.step}
            value={this.state.sliderValue}
            onChange={newValue => this.setState({ sliderValue: newValue })}
            onChangeComplete={this.handleOnChange.bind(null, this.props.control)}
            draggableTrack={true}
            ariaLabelledby={this.props.control.id}
            formatLabel={this.formatLabel}
          />
        </div>
      </FormRow>
    );
  }
}

RangeControl.propTypes = {
  control: PropTypes.object.isRequired,
  controlIndex: PropTypes.number.isRequired,
  stageFilter: PropTypes.func.isRequired
};

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { IndexPatternSelect } from './index_pattern_select';
import { FieldSelect } from './field_select';

export class RangeControlEditor extends Component {
  constructor(props) {
    super(props);
  }

  filterField(field) {
    return ['number'].includes(field.type);
  }

  render() {
    return (
      <div>

        <IndexPatternSelect
          value={this.props.controlParams.indexPattern}
          onChange={this.props.handleIndexPatternChange}
          getIndexPatterns={this.props.getIndexPatterns}
        />

        <FieldSelect
          value={this.props.controlParams.fieldName}
          indexPatternId={this.props.controlParams.indexPattern}
          filterField={this.filterField}
          onChange={this.props.handleFieldNameChange}
          getIndexPattern={this.props.getIndexPattern}
        />

        <div className="kuiSideBarFormRow">
          <label className="kuiSideBarFormRow__label" htmlFor="stepSize">
            Step Size
          </label>
          <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
            <input
              id="stepSize"
              className="kuiTextInput"
              type="number"
              value={this.props.controlParams.options.step}
              onChange={this.props.handleStepChange}
            />
          </div>
        </div>

        <div className="kuiSideBarFormRow">
          <label className="kuiSideBarFormRow__label" htmlFor="decimalPlaces">
            Decimal Places
          </label>
          <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
            <input
              id="decimalPlaces"
              className="kuiTextInput"
              type="number"
              min="0"
              value={this.props.controlParams.options.decimalPlaces}
              onChange={this.props.handleDecimalPlacesChange}
            />
          </div>
        </div>

      </div>
    );
  }
}

RangeControlEditor.propTypes = {
  getIndexPatterns: PropTypes.func.isRequired,
  getIndexPattern: PropTypes.func.isRequired,
  controlParams: PropTypes.object.isRequired,
  handleFieldNameChange: PropTypes.func.isRequired,
  handleIndexPatternChange: PropTypes.func.isRequired,
  handleDecimalPlacesChange: PropTypes.func.isRequired,
  handleStepChange: PropTypes.func.isRequired
};

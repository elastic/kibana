import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';
import { IndexPatternSelect } from './index_pattern_select';
import { FieldSelect } from './field_select';

import {
  EuiFormRow,
  EuiFieldNumber,
  EuiSwitch,
  EuiSelect,
  EuiButtonEmpty,
  EuiIconTip,
  EuiText,
} from '@elastic/eui';

function filterField(field) {
  return field.aggregatable && ['number', 'boolean', 'date', 'ip', 'string'].includes(field.type);
}

export class ListControlEditor extends Component {

  state = {
    showAdvanced: false
  }

  renderAdvancedOptions() {
    if (this.state.showAdvanced) {
      const timeoutId = `size-${this.props.controlIndex}`;
      return (
        <Fragment>
          <EuiFormRow
            id={timeoutId}
            label={(
              <EuiText>
                Timeout
                <EuiIconTip
                  content={`Terms search timeout (seconds),
                    bounding the terms request to be executed within the specified time value and
                    bail with the hits accumulated up to that point when expired.`}
                  position="right"
                />
              </EuiText>
            )}
          >
            <EuiFieldNumber
              min={1}
              value={this.props.controlParams.options.timeout}
              onChange={(evt) => {
                this.props.handleNumberOptionChange(this.props.controlIndex, 'timeout', evt);
              }}
              data-test-subj="listControlTimeoutInput"
            />
          </EuiFormRow>
          <EuiFormRow
            id={timeoutId}
            label={(
              <EuiText>
                Terminate After
                <EuiIconTip
                  content={`The maximum number of documents to collect for each shard, upon reaching
                    which the query execution will terminate early.`}
                  position="right"
                />
              </EuiText>
            )}
          >
            <EuiFieldNumber
              min={1}
              value={this.props.controlParams.options.terminateAfter}
              onChange={(evt) => {
                this.props.handleNumberOptionChange(this.props.controlIndex, 'terminateAfter', evt);
              }}
              data-test-subj="listControlTerminateAfterInput"
            />
          </EuiFormRow>
        </Fragment>
      );
    }
  }

  renderParentSelect() {
    if (this.props.parentCandidates && this.props.parentCandidates.length > 0) {
      const options = [
        { value: '', text: '' },
        ...this.props.parentCandidates,
      ];
      return (
        <EuiFormRow
          id={`parentSelect-${this.props.controlIndex}`}
          label="Parent control"
          helpText="Options are based on the value of parent control. Disabled if parent is not set."
        >
          <EuiSelect
            options={options}
            value={this.props.controlParams.parent}
            onChange={(evt) => {
              this.props.handleParentChange(this.props.controlIndex, evt);
            }}
          />
        </EuiFormRow>
      );
    }
  }

  render() {
    const multiselectId = `multiselect-${this.props.controlIndex}`;
    const sizeId = `size-${this.props.controlIndex}`;
    return (
      <div>

        <IndexPatternSelect
          value={this.props.controlParams.indexPattern}
          onChange={this.props.handleIndexPatternChange}
          getIndexPatterns={this.props.getIndexPatterns}
          controlIndex={this.props.controlIndex}
        />

        <FieldSelect
          value={this.props.controlParams.fieldName}
          indexPatternId={this.props.controlParams.indexPattern}
          filterField={filterField}
          onChange={this.props.handleFieldNameChange}
          getIndexPattern={this.props.getIndexPattern}
          controlIndex={this.props.controlIndex}
        />

        { this.renderParentSelect() }

        <EuiFormRow
          id={multiselectId}
        >
          <EuiSwitch
            label="Multiselect"
            checked={this.props.controlParams.options.multiselect}
            onChange={(evt) => {
              this.props.handleCheckboxOptionChange(this.props.controlIndex, 'multiselect', evt);
            }}
            data-test-subj="listControlMultiselectInput"
          />
        </EuiFormRow>

        <EuiFormRow
          id={sizeId}
          label="Size"
        >
          <EuiFieldNumber
            min={1}
            value={this.props.controlParams.options.size}
            onChange={(evt) => {
              this.props.handleNumberOptionChange(this.props.controlIndex, 'size', evt);
            }}
            data-test-subj="listControlSizeInput"
          />
        </EuiFormRow>

        <EuiButtonEmpty
          onClick={() => {
            this.setState(prevState => (
              {  showAdvanced: !prevState.showAdvanced }
            ));
          }}
          iconType={this.state.showAdvanced ? 'arrowDown' : 'arrowRight'}
          iconSide="left"
        >
          Advanced
        </EuiButtonEmpty>

        { this.renderAdvancedOptions() }

      </div>
    );
  }
}

ListControlEditor.propTypes = {
  getIndexPatterns: PropTypes.func.isRequired,
  getIndexPattern: PropTypes.func.isRequired,
  controlIndex: PropTypes.number.isRequired,
  controlParams: PropTypes.object.isRequired,
  handleFieldNameChange: PropTypes.func.isRequired,
  handleIndexPatternChange: PropTypes.func.isRequired,
  handleCheckboxOptionChange: PropTypes.func.isRequired,
  handleNumberOptionChange: PropTypes.func.isRequired,
  parentCandidates: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  })).isRequired,
  handleParentChange: PropTypes.func.isRequired,
};

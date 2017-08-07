import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import Select from 'react-select';

// React select tries to perform client-side filtering of options
// Since options are loaded from ES, client-side filtering is not desired
// Return all as a way to disable client-side filtering
function allowAnyOption() {
  return true;
}
function allowAllOptions(options) {
  return options;
}

export class TextControl extends Component {
  constructor(props) {
    super(props);

    this.handleOnChange = this.handleOnChange.bind(this);
    this.loadSuggestions = this.loadSuggestions.bind(this);
  }

  loadSuggestions(input, callback) {
    if(input.length === 0) {
      callback(null, { options: [], complete: false, cache: false });
      return;
    }
    this.props.control.getSuggestions(input).then(searchResp => {
      const values = _.get(searchResp, 'hits.hits', []).map((hit) => {
        return _.get(hit, `_source.${this.props.control.field.name}`);
      });
      // todo remove duplicates and sort
      const options = values.map((value) => {
        return { label: value, value: value };
      });
      callback(null, { options: options, complete: false, cache: false });
    });
  }

  handleOnChange(control, evt) {
    let newValue = '';
    let newFilter = undefined;
    if (evt) {
      newValue = evt.value;
      newFilter = this.props.control.filterManager.createFilter(newValue);
    }
    this.props.stageFilter(this.props.controlIndex, newValue, newFilter);
  }

  render() {
    return (
      <div className="input-control text-control">
        <span>{this.props.control.label}</span>
        <Select.Async
          placeholder=""
          value={this.props.control.value}
          loadOptions={this.loadSuggestions}
          onChange={this.handleOnChange.bind(null, this.props.control)}
          resetValue={''}
          autoload={false}
          filterOption={allowAnyOption}
          filterOptions={allowAllOptions}
        />
      </div>
    );
  }
}

TextControl.propTypes = {
  control: PropTypes.object.isRequired,
  controlIndex: PropTypes.number.isRequired,
  stageFilter: PropTypes.func.isRequired
};

import React, { Component, PropTypes } from 'react';
import Select from 'react-select';

export class TextControl extends Component {
  constructor(props) {
    super(props);

    this.handleOnChange = this.handleOnChange.bind(this);
    this.loadSuggestions = this.loadSuggestions.bind(this);
  }

  loadSuggestions(input, callback) {
    this.props.control.getSuggestions(this.props.control.value).then(suggestions => {
      const options = suggestions.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      }).map(function (suggestion) {
        return { label: suggestion, value: suggestion };
      });
      callback(null, { options: options, complete: false });
    });
  }

  handleOnChange(control, evt) {
    if (evt) {
      this.props.setFilter(control.filterManager, evt.value);
    } else {
      this.props.removeFilter(control.filterManager);
    }
  }

  render() {
    return (
      <div className="input-control">
        <span>{this.props.control.label}</span>
        <Select.Async
          placeholder=""
          value={this.props.control.value}
          loadOptions={this.loadSuggestions}
          onChange={this.handleOnChange.bind(null, this.props.control)}
          resetValue={''}
        />
      </div>
    );
  }
}

TextControl.propTypes = {
  setFilter: PropTypes.func.isRequired,
  removeFilter: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired
};

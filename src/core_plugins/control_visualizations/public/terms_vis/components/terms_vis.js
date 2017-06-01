import React, { Component } from 'react';
import Select from 'react-select';

export class TermsVis extends Component {
  constructor(props) {
    super(props);

    this.handleOnChange = this.handleOnChange.bind(this);
  }

  handleOnChange(control, evt) {
    if (evt) {
      this.props.setFilter(control.field, evt.value, control.indexPattern);
    } else {
      this.props.removeFilter(control.field, control.indexPattern);
    }
  }

  render() {
    return (
      <div className="vertical-layout">
        {this.props.controls.map((control, index) =>
          <div key={index} className="terms-field">
            <span>{control.label}</span>
            <Select
              className="terms-select"
              placeholder="Select..."
              value={control.selected}
              options={control.terms}
              onChange={this.handleOnChange.bind(null, control)}/>
          </div>
        )}
      </div>
    );
  }
}

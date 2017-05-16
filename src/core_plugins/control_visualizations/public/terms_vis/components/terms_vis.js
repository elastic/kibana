import React, { Component } from 'react';
import Select from 'react-select';

export class TermsVis extends Component {
  constructor(props) {
    super(props);

    this.handleOnChange = this.handleOnChange.bind(this);
  }

  handleOnChange(control, evt) {
    this.props.setFilter(control.field, evt.value, control.indexPattern);
  }

  render() {
    return (
      <div>
        {this.props.controls.map((control, index) =>
          <div key={index}>
            <span>{control.label}</span>
            <Select
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

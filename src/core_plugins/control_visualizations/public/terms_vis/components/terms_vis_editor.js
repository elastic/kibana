import React, { Component } from 'react';

export class TermsVisEditor extends Component {
  constructor(props) {
    super(props);

    this.handleLabelChange = this.handleLabelChange.bind(this);
  }
  handleLabelChange(evt) {
    this.props.setVisParam('label', evt.target.value);
  }
  render() {
    return (
      <div className="kuiFieldGroup">
        <div className="kuiFieldGroupSection">
          <label>
            Label
          </label>
        </div>

        <div className="kuiFieldGroupSection">
          <input
            className="kuiTextInput"
            type="text"
            value={this.props.visParams.label}
            onChange={this.handleLabelChange} />
        </div>
      </div>
    );
  }
}
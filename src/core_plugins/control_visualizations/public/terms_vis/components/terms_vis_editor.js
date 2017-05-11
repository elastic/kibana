import React, { Component } from 'react';
import {
  KuiButton,
  KuiButtonIcon,
} from 'ui_framework/components';

export class TermsVisEditor extends Component {
  constructor(props) {
    super(props);

    this.handleLabelChange = this.handleLabelChange.bind(this);
    this.addField = this.addField.bind(this);
  }

  handleLabelChange(fieldIndex, evt) {
    const updatedField = this.props.visParams.fields[fieldIndex];
    updatedField.label = evt.target.value;
    const updatedFields = [
      ...this.props.visParams.fields.slice(0, fieldIndex),
      updatedField,
      ...this.props.visParams.fields.slice(fieldIndex + 1)
    ];
    this.props.setVisParam('fields', updatedFields);
  }

  addField() {
    const newField = {
      label: ''
    };
    const updatedFields = [
      ...this.props.visParams.fields,
      newField
    ];
    this.props.setVisParam('fields', updatedFields);
  }

  renderFields() {
    return this.props.visParams.fields.map((field, index) => {
      return (
        <div key={index}>
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
                value={field.label}
                onChange={this.handleLabelChange.bind(null, index)} />
            </div>
          </div>
        </div>
      );
    });
  }

  render() {
    return (
      <div>

        {this.renderFields()}

        <KuiButton
          type="primary"
          icon={<KuiButtonIcon type="create" />}
          onClick={this.addField}
        >
          Add
        </KuiButton>
      </div>
    );
  }
}
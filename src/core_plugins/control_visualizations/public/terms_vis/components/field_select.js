import React, { Component, PropTypes } from 'react';
import Select from 'react-select';

export class FieldSelect extends Component {
  constructor(props) {
    super(props);

    this.loadFields = this.loadFields.bind(this);
  }

  loadFields(input, callback) {
    if (!this.props.indexPatternId || this.props.indexPatternId.length === 0) {
      callback(null, { options: [] });
      return;
    }

    this.props.getIndexPattern(this.props.indexPatternId).then(index => {
      const fields = index.fields.filter(function (field) {
        return field.aggregatable && field.type === 'string';
      }).sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      }).map(function (field) {
        return { label: field.name, value: field.name };
      });
      //Setting complete=true means loadOptions will never be called again.
      callback(null, { options: fields, complete: true });
    });
  }

  render() {
    if (!this.props.indexPatternId || this.props.indexPatternId.trim().length === 0) {
      return null;
    }

    return (
      <div className="kuiFieldGroup">
        <div className="kuiFieldGroupSection">
          <label>
            Terms Field
          </label>
        </div>
        <div className="kuiFieldGroupSection kuiFieldGroupSection--wide">
          <Select.Async
            placeholder="Select..."
            value={this.props.value}
            loadOptions={this.loadFields}
            onChange={this.props.onChange}/>
        </div>
      </div>
    );
  }
}

FieldSelect.propTypes = {
  getIndexPattern: PropTypes.func.isRequired,
  indexPatternId: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string
};

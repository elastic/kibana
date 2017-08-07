import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import Select from 'react-select';

export class FieldSelect extends Component {
  constructor(props) {
    super(props);

    this.filterField = _.get(props, 'filterField', () => { return true; });
    this.loadFields = this.loadFields.bind(this);
  }

  loadFields(input, callback) {
    if (!this.props.indexPatternId || this.props.indexPatternId.length === 0) {
      callback(null, { options: [] });
      return;
    }

    this.props.getIndexPattern(this.props.indexPatternId).then(index => {
      const fields = index.fields
      .filter(this.filterField)
      .sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      }).map(function (field) {
        return { label: field.name, value: field.name };
      });
      // Setting complete=true means loadOptions will never be called again.
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
            Field
          </label>
        </div>
        <div className="kuiFieldGroupSection kuiFieldGroupSection--wide">
          <Select.Async
            className="field-react-select"
            placeholder="Select..."
            value={this.props.value}
            loadOptions={this.loadFields}
            onChange={this.props.onChange}
            resetValue={''}
          />
        </div>
      </div>
    );
  }
}

FieldSelect.propTypes = {
  getIndexPattern: PropTypes.func.isRequired,
  indexPatternId: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  filterField: PropTypes.func
};

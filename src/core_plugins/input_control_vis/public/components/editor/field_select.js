import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiFormRow,
  EuiComboBox,
} from '@elastic/eui';

export class FieldSelect extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      fields: [],
      indexPatternId: props.indexPatternId,
    };
    this.filterField = _.get(props, 'filterField', () => { return true; });
  }

  componentWillMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this.loadFields(this.state.indexPatternId);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.indexPatternId !== nextProps.indexPatternId) {
      this.loadFields(nextProps.indexPatternId);
    }
  }

  loadFields = (indexPatternId) => {
    this.setState({
      isLoading: true,
      fields: [],
      indexPatternId
    }, this.debouncedLoad.bind(null, indexPatternId));
  }

  debouncedLoad = _.debounce(async (indexPatternId) => {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    const indexPattern = await this.props.getIndexPattern(indexPatternId);

    if (!this._isMounted) {
      return;
    }

    // props.indexPatternId may be updated before getIndexPattern returns
    // ignore response when fetched index pattern does not match active index pattern
    if (indexPattern.id !== this.state.indexPatternId) {
      return;
    }

    const fieldsByTypeMap = new Map();
    const fields = [];
    indexPattern.fields
      .filter(this.filterField)
      .forEach(field => {
        if (fieldsByTypeMap.has(field.type)) {
          const fieldsList = fieldsByTypeMap.get(field.type);
          fieldsList.push(field.name);
          fieldsByTypeMap.set(field.type, fieldsList);
        } else {
          fieldsByTypeMap.set(field.type, [field.name]);
        }
      });

    fieldsByTypeMap.forEach((fieldsList, fieldType) => {
      fields.push({
        label: fieldType,
        options: fieldsList.sort().map(fieldName => {
          return { value: fieldName, label: fieldName };
        })
      });
    });

    fields.sort((a, b) => {
      if (a.label < b.label) return -1;
      if (a.label > b.label) return 1;
      return 0;
    });

    this.setState({
      isLoading: false,
      fields: fields
    });
  }, 300);

  onChange = (selectedOptions) => {
    let selectedFieldName;
    if (selectedOptions.length) {
      selectedFieldName = selectedOptions[0].value;
    }
    this.props.onChange(selectedFieldName);
  }

  render() {
    if (!this.props.indexPatternId || this.props.indexPatternId.trim().length === 0) {
      return null;
    }

    const selectId = `fieldSelect-${this.props.controlIndex}`;

    const selectedOptions = [];
    if (this.props.fieldName) {
      selectedOptions.push({ value: this.props.fieldName, label: this.props.fieldName });
    }

    return (
      <EuiFormRow
        id={selectId}
        label="Field"
      >
        <EuiComboBox
          placeholder="Select field..."
          singleSelection={true}
          isLoading={this.state.isLoading}
          options={this.state.fields}
          selectedOptions={selectedOptions}
          onChange={this.onChange}
          data-test-subj={selectId}
        />
      </EuiFormRow>
    );
  }
}

FieldSelect.propTypes = {
  getIndexPattern: PropTypes.func.isRequired,
  indexPatternId: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  fieldName: PropTypes.string,
  filterField: PropTypes.func,
  controlIndex: PropTypes.number.isRequired,
};

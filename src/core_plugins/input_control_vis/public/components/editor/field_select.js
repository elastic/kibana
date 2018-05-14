import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Select from 'react-select';

import {
  EuiFormRow,
} from '@elastic/eui';

export class FieldSelect extends Component {
  constructor(props) {
    super(props);

    // not storing activeIndexPatternId in react state
    // 1) does not effect rendering
    // 2) requires synchronous modification to avoid race condition
    this.activeIndexPatternId = props.indexPatternId;

    this.state = {
      fields: []
    };
    this.filterField = _.get(props, 'filterField', () => { return true; });
    this.loadFields(props.indexPatternId);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.indexPatternId !== nextProps.indexPatternId) {
      this.activeIndexPatternId = nextProps.indexPatternId;
      this.setState({ fields: [] });
      this.loadFields(nextProps.indexPatternId);
    }
  }

  async loadFields(indexPatternId) {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    let indexPattern;
    try {
      indexPattern = await this.props.getIndexPattern(indexPatternId);
    } catch (err) {
      // index pattern no longer exists
      return;
    }

    // props.indexPatternId may be updated before getIndexPattern returns
    // ignore response when fetched index pattern does not match active index pattern
    if (indexPattern.id !== this.activeIndexPatternId) {
      return;
    }

    const fields = indexPattern.fields
      .filter(this.filterField)
      .sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      })
      .map(function (field) {
        return { label: field.name, value: field.name };
      });
    this.setState({ fields: fields });
  }

  render() {
    if (!this.props.indexPatternId || this.props.indexPatternId.trim().length === 0) {
      return null;
    }

    const selectId = `fieldSelect-${this.props.controlIndex}`;
    return (
      <EuiFormRow
        id={selectId}
        label="Field"
      >
        <Select
          className="field-react-select"
          placeholder="Select field..."
          value={this.props.value}
          options={this.state.fields}
          onChange={this.props.onChange}
          resetValue={''}
          inputProps={{ id: selectId }}
        />
      </EuiFormRow>
    );
  }
}

FieldSelect.propTypes = {
  getIndexPattern: PropTypes.func.isRequired,
  indexPatternId: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  filterField: PropTypes.func,
  controlIndex: PropTypes.number.isRequired,
};

import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Select from 'react-select';

export class FieldSelect extends Component {
  constructor(props) {
    super(props);

    this.state = {
      fields: []
    };
    this.filterField = _.get(props, 'filterField', () => { return true; });
    this.loadFields(this.props.indexPatternId);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.indexPatternId !== nextProps.indexPatternId) {
      this.setState({ fields: [] });
      this.loadFields(nextProps.indexPatternId);
    }
  }

  async loadFields(indexPatternId) {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }
    const indexPattern = await this.props.getIndexPattern(indexPatternId);
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

    return (
      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label" htmlFor="fieldSelect">
          Field
        </label>
        <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
          <Select
            className="field-react-select"
            placeholder="Select field..."
            value={this.props.value}
            options={this.state.fields}
            onChange={this.props.onChange}
            resetValue={''}
            inputProps={{ id: 'fieldSelect' }}
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

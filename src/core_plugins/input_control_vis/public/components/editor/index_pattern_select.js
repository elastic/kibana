import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiFormRow,
  EuiComboBox,
} from '@elastic/eui';

export class IndexPatternSelect extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      options: [],
      selectedIndexPattern: undefined,
    };
  }

  componentWillMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.debouncedFetch.cancel();
  }

  componentDidMount() {
    this.fetchOptions();
    this.fetchSelectedIndexPattern(this.props.value);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.props.value) {
      this.fetchSelectedIndexPattern(nextProps.value);
    }
  }

  fetchSelectedIndexPattern = async (indexPatternId) => {
    if (!indexPatternId) {
      this.setState({
        selectedIndexPattern: undefined
      });
      return;
    }

    const indexPattern = await this.props.getIndexPattern(indexPatternId);

    if (!this._isMounted) {
      return;
    }

    // TODO: handle case where index pattern no longer exists

    this.setState({
      selectedIndexPattern: {
        value: indexPattern.id,
        label: indexPattern.title,
      }
    });
  }

  debouncedFetch = _.debounce(async (searchValue) => {
    const indexPatternSavedObjects = await this.props.getIndexPatterns(searchValue);

    if (!this._isMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (searchValue === this.state.searchValue) {
      const options = indexPatternSavedObjects.map((indexPatternSavedObject) => {
        return {
          label: indexPatternSavedObject.attributes.title,
          value: indexPatternSavedObject.id
        };
      });
      this.setState({
        isLoading: false,
        options,
      });
    }
  }, 300);

  fetchOptions = (searchValue = '') => {
    this.setState({
      isLoading: true,
      searchValue
    }, this.debouncedFetch.bind(null, searchValue));
  }

  onChange = (selectedOptions) => {
    let selectedIndexPatternId;
    if (selectedOptions.length) {
      selectedIndexPatternId = selectedOptions[0].value;
    }
    this.props.onChange(selectedIndexPatternId);
  }

  render() {
    const selectedOptions = [];
    if (this.state.selectedIndexPattern) {
      selectedOptions.push(this.state.selectedIndexPattern);
    }
    return (
      <EuiFormRow
        id={`indexPatternSelect-${this.props.controlIndex}`}
        label="Index Pattern"
      >
        <EuiComboBox
          placeholder="Select index pattern..."
          singleSelection={true}
          isLoading={this.state.isLoading}
          onSearchChange={this.fetchOptions}
          options={this.state.options}
          selectedOptions={selectedOptions}
          onChange={this.onChange}
          data-test-subj="indexPatternSelect"
        />
      </EuiFormRow>
    );
  }
}

IndexPatternSelect.propTypes = {
  getIndexPatterns: PropTypes.func.isRequired,
  getIndexPattern: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  controlIndex: PropTypes.number.isRequired,
};

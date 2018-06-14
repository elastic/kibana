/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
    this.fetchSelectedIndexPattern(this.props.indexPatternId);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.indexPatternId !== this.props.indexPatternId) {
      this.fetchSelectedIndexPattern(nextProps.indexPatternId);
    }
  }

  fetchSelectedIndexPattern = async (indexPatternId) => {
    if (!indexPatternId) {
      this.setState({
        selectedIndexPattern: undefined
      });
      return;
    }

    let indexPattern;
    try {
      indexPattern = await this.props.getIndexPattern(indexPatternId);
    } catch (err) {
      // index pattern no longer exists
      return;
    }

    if (!this._isMounted) {
      return;
    }

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
    this.props.onChange(_.get(selectedOptions, '0.value'));
  }

  render() {
    const selectId = `indexPatternSelect-${this.props.controlIndex}`;
    const selectedOptions = [];
    if (this.state.selectedIndexPattern) {
      selectedOptions.push(this.state.selectedIndexPattern);
    }
    return (
      <EuiFormRow
        id={selectId}
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
          data-test-subj={selectId}
        />
      </EuiFormRow>
    );
  }
}

IndexPatternSelect.propTypes = {
  getIndexPatterns: PropTypes.func.isRequired,
  getIndexPattern: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  indexPatternId: PropTypes.string,
  controlIndex: PropTypes.number.isRequired,
};

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
import React, { Component } from 'react';

import { EuiComboBox } from '@elastic/eui';
import { SavedObjectsClientContract, SimpleSavedObject } from '../../../../../core/public';
import { getTitle } from '../../index_patterns/lib';

export interface IndexPatternSelectProps {
  onChange: (opt: any) => void;
  indexPatternId: string;
  placeholder: string;
  fieldTypes: string[];
  onNoIndexPatterns: () => void;
  savedObjectsClient: SavedObjectsClientContract;
}

interface IndexPatternSelectState {
  isLoading: boolean;
  options: [];
  selectedIndexPattern: string | undefined;
  searchValue: string | undefined;
}

const getIndexPatterns = async (
  client: SavedObjectsClientContract,
  search: string,
  fields: string[]
) => {
  const resp = await client.find({
    type: 'index-pattern',
    fields,
    search: `${search}*`,
    searchFields: ['title'],
    perPage: 100,
  });
  return resp.savedObjects;
};

// Takes in stateful runtime dependencies and pre-wires them to the component
export function createIndexPatternSelect(savedObjectsClient: SavedObjectsClientContract) {
  return (props: Omit<IndexPatternSelectProps, 'savedObjectsClient'>) => (
    <IndexPatternSelect {...props} savedObjectsClient={savedObjectsClient} />
  );
}

export class IndexPatternSelect extends Component<IndexPatternSelectProps> {
  private isMounted: boolean = false;
  state: IndexPatternSelectState;

  constructor(props: IndexPatternSelectProps) {
    super(props);

    this.state = {
      isLoading: false,
      options: [],
      selectedIndexPattern: undefined,
      searchValue: undefined,
    };
  }

  componentWillUnmount() {
    this.isMounted = false;
    this.debouncedFetch.cancel();
  }

  componentDidMount() {
    this.isMounted = true;
    this.fetchOptions();
    this.fetchSelectedIndexPattern(this.props.indexPatternId);
  }

  UNSAFE_componentWillReceiveProps(nextProps: IndexPatternSelectProps) {
    if (nextProps.indexPatternId !== this.props.indexPatternId) {
      this.fetchSelectedIndexPattern(nextProps.indexPatternId);
    }
  }

  fetchSelectedIndexPattern = async (indexPatternId: string) => {
    if (!indexPatternId) {
      this.setState({
        selectedIndexPattern: undefined,
      });
      return;
    }

    let indexPatternTitle;
    try {
      indexPatternTitle = await getTitle(this.props.savedObjectsClient, indexPatternId);
    } catch (err) {
      // index pattern no longer exists
      return;
    }

    if (!this.isMounted) {
      return;
    }

    this.setState({
      selectedIndexPattern: {
        value: indexPatternId,
        label: indexPatternTitle,
      },
    });
  };

  debouncedFetch = _.debounce(async (searchValue: string) => {
    const { fieldTypes, onNoIndexPatterns, savedObjectsClient } = this.props;

    const savedObjectFields = ['title'];
    if (fieldTypes) {
      savedObjectFields.push('fields');
    }
    let savedObjects = await getIndexPatterns(savedObjectsClient, searchValue, savedObjectFields);

    if (fieldTypes) {
      savedObjects = savedObjects.filter((savedObject: SimpleSavedObject<any>) => {
        try {
          const indexPatternFields = JSON.parse(savedObject.attributes.fields as any);
          return indexPatternFields.some((field: any) => {
            return fieldTypes.includes(field.type);
          });
        } catch (err) {
          // Unable to parse fields JSON, invalid index pattern
          return false;
        }
      });
    }

    if (!this.isMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (searchValue === this.state.searchValue) {
      const options = savedObjects.map((indexPatternSavedObject: SimpleSavedObject<any>) => {
        return {
          label: indexPatternSavedObject.attributes.title,
          value: indexPatternSavedObject.id,
        };
      });
      this.setState({
        isLoading: false,
        options,
      });

      if (onNoIndexPatterns && searchValue === '' && options.length === 0) {
        onNoIndexPatterns();
      }
    }
  }, 300);

  fetchOptions = (searchValue = '') => {
    this.setState(
      {
        isLoading: true,
        searchValue,
      },
      this.debouncedFetch.bind(null, searchValue)
    );
  };

  onChange = (selectedOptions: any) => {
    this.props.onChange(_.get(selectedOptions, '0.value'));
  };

  render() {
    const {
      fieldTypes, // eslint-disable-line no-unused-vars
      onChange, // eslint-disable-line no-unused-vars
      indexPatternId, // eslint-disable-line no-unused-vars
      placeholder,
      onNoIndexPatterns, // eslint-disable-line no-unused-vars
      savedObjectsClient, // eslint-disable-line no-unused-vars
      ...rest
    } = this.props;

    return (
      <EuiComboBox
        placeholder={placeholder}
        singleSelection={true}
        isLoading={this.state.isLoading}
        onSearchChange={this.fetchOptions}
        options={this.state.options}
        selectedOptions={this.state.selectedIndexPattern ? [this.state.selectedIndexPattern] : []}
        onChange={this.onChange}
        {...rest}
      />
    );
  }
}

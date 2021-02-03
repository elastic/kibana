/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import React, { Component } from 'react';

import { Required } from '@kbn/utility-types';
import { EuiComboBox, EuiComboBoxProps } from '@elastic/eui';

import { IndexPatternsContract } from 'src/plugins/data/public';

export type IndexPatternSelectProps = Required<
  Omit<
    EuiComboBoxProps<any>,
    'isLoading' | 'onSearchChange' | 'options' | 'selectedOptions' | 'onChange'
  >,
  'placeholder'
> & {
  onChange: (indexPatternId?: string) => void;
  indexPatternId: string;
  fieldTypes?: string[];
  onNoIndexPatterns?: () => void;
};

export type IndexPatternSelectInternalProps = IndexPatternSelectProps & {
  indexPatternService: IndexPatternsContract;
};

interface IndexPatternSelectState {
  isLoading: boolean;
  options: [];
  selectedIndexPattern: { value: string; label: string } | undefined;
  searchValue: string | undefined;
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default class IndexPatternSelect extends Component<IndexPatternSelectInternalProps> {
  private isMounted: boolean = false;
  state: IndexPatternSelectState;

  constructor(props: IndexPatternSelectInternalProps) {
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

  UNSAFE_componentWillReceiveProps(nextProps: IndexPatternSelectInternalProps) {
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
      const indexPattern = await this.props.indexPatternService.get(indexPatternId);
      indexPatternTitle = indexPattern.title;
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
    const { fieldTypes, onNoIndexPatterns, indexPatternService } = this.props;
    const indexPatterns = await indexPatternService.find(`${searchValue}*`, 100);

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (searchValue !== this.state.searchValue || !this.isMounted) {
      return;
    }

    const options = indexPatterns
      .filter((indexPattern) => {
        return fieldTypes
          ? indexPattern.fields.some((field) => {
              return fieldTypes.includes(field.type);
            })
          : true;
      })
      .map((indexPattern) => {
        return {
          label: indexPattern.title,
          value: indexPattern.id,
        };
      });
    this.setState({
      isLoading: false,
      options,
    });

    if (onNoIndexPatterns && searchValue === '' && options.length === 0) {
      onNoIndexPatterns();
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
      fieldTypes,
      onChange,
      indexPatternId,
      placeholder,
      onNoIndexPatterns,
      indexPatternService,
      ...rest
    } = this.props;

    return (
      <EuiComboBox
        {...rest}
        placeholder={placeholder}
        singleSelection={true}
        isLoading={this.state.isLoading}
        onSearchChange={this.fetchOptions}
        options={this.state.options}
        selectedOptions={this.state.selectedIndexPattern ? [this.state.selectedIndexPattern] : []}
        onChange={this.onChange}
      />
    );
  }
}

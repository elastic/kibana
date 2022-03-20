/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import React, { Component } from 'react';

import { Required } from '@kbn/utility-types';
import { EuiComboBox, EuiComboBoxProps } from '@elastic/eui';

import { IndexPatternsContract } from '../../../data/public';

export type IndexPatternSelectProps = Required<
  Omit<
    EuiComboBoxProps<any>,
    'isLoading' | 'onSearchChange' | 'options' | 'selectedOptions' | 'onChange'
  >,
  'placeholder'
> & {
  onChange: (indexPatternId?: string) => void;
  indexPatternId: string;
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
    this.fetchOptions('');
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
    const idsAndTitles = await this.props.indexPatternService.getIdsWithTitle();
    if (!this.isMounted || searchValue !== this.state.searchValue) {
      return;
    }

    const options = [];
    for (let i = 0; i < idsAndTitles.length; i++) {
      if (idsAndTitles[i].title.toLowerCase().includes(searchValue.toLowerCase())) {
        options.push({
          label: idsAndTitles[i].title,
          value: idsAndTitles[i].id,
        });
      }
    }

    this.setState({
      isLoading: false,
      options,
    });

    if (this.props.onNoIndexPatterns && searchValue === '' && options.length === 0) {
      this.props.onNoIndexPatterns();
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

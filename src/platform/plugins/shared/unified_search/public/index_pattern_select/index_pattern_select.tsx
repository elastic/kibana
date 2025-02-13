/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import React, { Component } from 'react';

import { Required } from '@kbn/utility-types';
import { EuiComboBox, EuiComboBoxProps } from '@elastic/eui';
import { calculateWidthFromEntries } from '@kbn/calculate-width-from-char-count';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import {
  MIDDLE_TRUNCATION_PROPS,
  SINGLE_SELECTION_AS_TEXT_PROPS,
} from '../filter_bar/filter_editor/lib/helpers';

export type IndexPatternSelectProps = Required<
  Omit<EuiComboBoxProps<any>, 'onSearchChange' | 'options' | 'selectedOptions' | 'onChange'>,
  'placeholder'
> & {
  onChange: (indexPatternId?: string) => void;
  indexPatternId: string;
  onNoIndexPatterns?: () => void;
};

export type IndexPatternSelectInternalProps = IndexPatternSelectProps & {
  indexPatternService: DataViewsContract;
};

interface IndexPatternSelectState {
  isLoading: boolean;
  options: Array<{ value: string; label: string }>;
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

    let label;
    try {
      const indexPattern = await this.props.indexPatternService.get(indexPatternId);
      label = indexPattern.getName();
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
        label,
      },
    });
  };

  debouncedFetch = _.debounce(async (searchValue: string) => {
    const dataViews = await this.props.indexPatternService.getIdsWithTitle();
    if (!this.isMounted || searchValue !== this.state.searchValue) {
      return;
    }

    const options = [];
    for (let i = 0; i < dataViews.length; i++) {
      const label = dataViews[i].name ? dataViews[i].name : dataViews[i].title;
      if (label && label.toLowerCase().includes(searchValue.toLowerCase())) {
        options.push({
          label,
          value: dataViews[i].id,
        });
      }
    }

    this.setState({
      isLoading: false,
      options: options.sort((a, b) => a.label.localeCompare(b.label)),
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

    const panelMinWidth = calculateWidthFromEntries(this.state.options, ['label']);

    return (
      <EuiComboBox
        {...rest}
        placeholder={placeholder}
        singleSelection={SINGLE_SELECTION_AS_TEXT_PROPS}
        isLoading={this.state.isLoading || this.props.isLoading}
        onSearchChange={this.fetchOptions}
        options={this.state.options}
        selectedOptions={this.state.selectedIndexPattern ? [this.state.selectedIndexPattern] : []}
        onChange={this.onChange}
        truncationProps={MIDDLE_TRUNCATION_PROPS}
        inputPopoverProps={{ panelMinWidth }}
      />
    );
  }
}

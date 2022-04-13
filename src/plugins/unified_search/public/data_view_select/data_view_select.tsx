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
import { IndexPatternsContract as DataViewsContract } from '../../../data/public';

export type DataViewSelectProps = Required<
  Omit<
    EuiComboBoxProps<any>,
    'isLoading' | 'onSearchChange' | 'options' | 'selectedOptions' | 'onChange'
  >,
  'placeholder'
> & {
  onChange: (dataViewId?: string) => void;
  indexPatternId: string;
  onNoDataViews?: () => void;
};

export type DataViewSelectInternalProps = DataViewSelectProps & {
  dataViewService: DataViewsContract;
};

interface DataViewSelectState {
  isLoading: boolean;
  options: [];
  selectedDataView: { value: string; label: string } | undefined;
  searchValue: string | undefined;
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default class DataViewSelect extends Component<DataViewSelectInternalProps> {
  private isMounted: boolean = false;
  state: DataViewSelectState;

  constructor(props: DataViewSelectInternalProps) {
    super(props);

    this.state = {
      isLoading: false,
      options: [],
      selectedDataView: undefined,
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
    this.fetchSelectedDataView(this.props.indexPatternId);
  }

  UNSAFE_componentWillReceiveProps(nextProps: DataViewSelectInternalProps) {
    if (nextProps.indexPatternId !== this.props.indexPatternId) {
      this.fetchSelectedDataView(nextProps.indexPatternId);
    }
  }

  fetchSelectedDataView = async (dataViewId: string) => {
    if (!dataViewId) {
      this.setState({
        selecteddataView: undefined,
      });
      return;
    }

    let dataViewTitle;
    try {
      const dataView = await this.props.dataViewService.get(dataViewId);
      dataViewTitle = dataView.title;
    } catch (err) {
      // index pattern no longer exists
      return;
    }

    if (!this.isMounted) {
      return;
    }

    this.setState({
      selectedDataView: {
        value: dataViewId,
        label: dataViewTitle,
      },
    });
  };

  debouncedFetch = _.debounce(async (searchValue: string) => {
    const idsAndTitles = await this.props.dataViewService.getIdsWithTitle();
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

    if (this.props.onNoDataViews && searchValue === '' && options.length === 0) {
      this.props.onNoDataViews();
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
    const { onChange, indexPatternId, placeholder, onNoDataViews, dataViewService, ...rest } =
      this.props;

    return (
      <EuiComboBox
        {...rest}
        placeholder={placeholder}
        singleSelection={true}
        isLoading={this.state.isLoading}
        onSearchChange={this.fetchOptions}
        options={this.state.options}
        selectedOptions={this.state.selectedDataView ? [this.state.selectedDataView] : []}
        onChange={this.onChange}
      />
    );
  }
}

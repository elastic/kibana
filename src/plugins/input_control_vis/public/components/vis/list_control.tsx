/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PureComponent } from 'react';
import _ from 'lodash';

import { injectI18n, InjectedIntlProps } from '@kbn/i18n-react';
import { EuiFieldText, EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormRow } from './form_row';

interface ListControlUiState {
  isLoading: boolean;
}

export type ListControlUiProps = InjectedIntlProps & {
  id: string;
  label: string;
  selectedOptions: any[];
  options?: any[];
  formatOptionLabel: (option: any) => any;
  disableMsg?: string;
  multiselect?: boolean;
  dynamicOptions?: boolean;
  partialResults?: boolean;
  controlIndex: number;
  stageFilter: (controlIndex: number, value: any) => void;
  fetchOptions?: (searchValue: string) => void;
};

class ListControlUi extends PureComponent<ListControlUiProps, ListControlUiState> {
  static defaultProps = {
    dynamicOptions: false,
    multiselect: true,
    selectedOptions: [],
    options: [],
  };

  private isMounted: boolean = false;

  state = {
    isLoading: false,
  };
  private textInput: HTMLElement | null;

  constructor(props: ListControlUiProps) {
    super(props);
    this.textInput = null;
  }

  componentDidMount = () => {
    if (this.textInput) {
      this.textInput.setAttribute('focusable', 'false'); // remove when #59039 is fixed
    }
    this.isMounted = true;
  };

  componentWillUnmount = () => {
    this.isMounted = false;
  };

  setTextInputRef = (ref: HTMLInputElement | null) => {
    this.textInput = ref;
  };

  handleOnChange = (selectedOptions: any[]) => {
    const selectedValues = selectedOptions.map(({ value }) => {
      return value;
    });
    this.props.stageFilter(this.props.controlIndex, selectedValues);
  };

  debouncedFetch = _.debounce(async (searchValue: string) => {
    if (this.props.fetchOptions) {
      await this.props.fetchOptions(searchValue);
    }

    if (this.isMounted) {
      this.setState({
        isLoading: false,
      });
    }
  }, 300);

  onSearchChange = (searchValue: string) => {
    this.setState(
      {
        isLoading: true,
      },
      this.debouncedFetch.bind(null, searchValue)
    );
  };

  renderControl() {
    const { intl } = this.props;

    if (this.props.disableMsg) {
      return (
        <EuiFieldText
          aria-label={intl.formatMessage({
            id: 'inputControl.vis.listControl.selectTextPlaceholder',
            defaultMessage: 'Select...',
          })}
          placeholder={intl.formatMessage({
            id: 'inputControl.vis.listControl.selectTextPlaceholder',
            defaultMessage: 'Select...',
          })}
          disabled={true}
        />
      );
    }

    const options = this.props.options
      ?.map((option) => {
        return {
          label: this.props.formatOptionLabel(option).toString(),
          value: option,
          ['data-test-subj']: `option_${option.toString().replace(' ', '_')}`,
        };
      })
      .sort((a, b) => {
        return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
      });

    const selectedOptions = this.props.selectedOptions.map((selectedOption) => {
      return {
        label: this.props.formatOptionLabel(selectedOption).toString(),
        value: selectedOption,
      };
    });

    return (
      <EuiComboBox
        placeholder={intl.formatMessage({
          id: 'inputControl.vis.listControl.selectPlaceholder',
          defaultMessage: 'Select...',
        })}
        options={options}
        isLoading={this.state.isLoading}
        async={this.props.dynamicOptions}
        onSearchChange={this.props.dynamicOptions ? this.onSearchChange : undefined}
        selectedOptions={selectedOptions}
        onChange={this.handleOnChange}
        singleSelection={!this.props.multiselect}
        data-test-subj={`listControlSelect${this.props.controlIndex}`}
        inputRef={this.setTextInputRef}
      />
    );
  }

  render() {
    const partialResultsWarningMessage = i18n.translate(
      'inputControl.vis.listControl.partialResultsWarningMessage',
      {
        defaultMessage:
          'Terms list might be incomplete because the request is taking too long. ' +
          'Adjust the autocomplete settings in kibana.yml for complete results.',
      }
    );

    return (
      <FormRow
        id={this.props.id}
        label={this.props.label}
        warningMsg={this.props.partialResults ? partialResultsWarningMessage : undefined}
        controlIndex={this.props.controlIndex}
        disableMsg={this.props.disableMsg}
      >
        {this.renderControl()}
      </FormRow>
    );
  }
}

export const ListControl = injectI18n(ListControlUi);

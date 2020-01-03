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
import { InjectedIntlProps } from 'react-intl';

import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';

import { IIndexPattern, IFieldType } from '../../../../../../plugins/data/public';

interface FieldSelectUiState {
  isLoading: boolean;
  fields: Array<EuiComboBoxOptionProps<string>>;
  indexPatternId: string;
}

export type FieldSelectUiProps = InjectedIntlProps & {
  getIndexPattern: (indexPatternId: string) => Promise<IIndexPattern>;
  indexPatternId: string;
  onChange: (value: any) => void;
  fieldName?: string;
  filterField?: (field: IFieldType) => boolean;
  controlIndex: number;
};

class FieldSelectUi extends Component<FieldSelectUiProps, FieldSelectUiState> {
  private hasUnmounted: boolean;

  constructor(props: FieldSelectUiProps) {
    super(props);

    this.hasUnmounted = false;

    this.state = {
      isLoading: false,
      fields: [],
      indexPatternId: props.indexPatternId,
    };
  }

  componentWillUnmount() {
    this.hasUnmounted = true;
  }

  componentDidMount() {
    this.loadFields(this.state.indexPatternId);
  }

  UNSAFE_componentWillReceiveProps(nextProps: FieldSelectUiProps) {
    if (this.props.indexPatternId !== nextProps.indexPatternId) {
      this.loadFields(nextProps.indexPatternId ?? '');
    }
  }

  loadFields = (indexPatternId: string) => {
    this.setState(
      {
        isLoading: true,
        fields: [],
        indexPatternId,
      },
      this.debouncedLoad.bind(null, indexPatternId)
    );
  };

  debouncedLoad = _.debounce(async (indexPatternId: string) => {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    let indexPattern: IIndexPattern;
    try {
      indexPattern = await this.props.getIndexPattern(indexPatternId);
    } catch (err) {
      // index pattern no longer exists
      return;
    }

    if (this.hasUnmounted) {
      return;
    }

    // props.indexPatternId may be updated before getIndexPattern returns
    // ignore response when fetched index pattern does not match active index pattern
    if (indexPattern.id !== this.state.indexPatternId) {
      return;
    }

    const fieldsByTypeMap = new Map<string, string[]>();
    const fields: Array<EuiComboBoxOptionProps<string>> = [];
    indexPattern.fields
      .filter(this.props.filterField ?? (() => true))
      .forEach((field: IFieldType) => {
        const fieldsList = fieldsByTypeMap.get(field.type) ?? [];
        fieldsList.push(field.name);
        fieldsByTypeMap.set(field.type, fieldsList);
      });

    fieldsByTypeMap.forEach((fieldsList, fieldType) => {
      fields.push({
        label: fieldType,
        options: fieldsList.sort().map(fieldName => {
          return { value: fieldName, label: fieldName };
        }),
      });
    });

    fields.sort((a, b) => {
      if (a.label < b.label) return -1;
      if (a.label > b.label) return 1;
      return 0;
    });

    this.setState({
      isLoading: false,
      fields,
    });
  }, 300);

  onChange = (selectedOptions: Array<EuiComboBoxOptionProps<any>>) => {
    this.props.onChange(_.get(selectedOptions, '0.value'));
  };

  render() {
    if (!this.props.indexPatternId || this.props.indexPatternId.trim().length === 0) {
      return null;
    }

    const selectId = `fieldSelect-${this.props.controlIndex}`;

    const selectedOptions = [];
    const { intl } = this.props;
    if (this.props.fieldName) {
      selectedOptions.push({ value: this.props.fieldName, label: this.props.fieldName });
    }

    return (
      <EuiFormRow
        id={selectId}
        label={
          <FormattedMessage
            id="inputControl.editor.fieldSelect.fieldLabel"
            defaultMessage="Field"
          />
        }
      >
        <EuiComboBox
          placeholder={intl.formatMessage({
            id: 'inputControl.editor.fieldSelect.selectFieldPlaceholder',
            defaultMessage: 'Select field...',
          })}
          singleSelection={true}
          isLoading={this.state.isLoading}
          options={this.state.fields}
          selectedOptions={selectedOptions}
          onChange={this.onChange}
          data-test-subj={selectId}
        />
      </EuiFormRow>
    );
  }
}

export const FieldSelect = injectI18n(FieldSelectUi);

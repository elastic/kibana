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

import {
  EuiButton,
  EuiButtonEmpty,
  // @ts-ignore
  EuiCodeEditor,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import {
  buildExistsFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
  buildQueryFilter,
  buildRangeFilter,
} from '@kbn/es-query';
import { get } from 'lodash';
import React, { Component } from 'react';
import { IndexPattern, IndexPatternField } from 'ui/index_patterns';
import { FieldFilter, MetaFilter } from '../../filters';
import { FieldInput } from './field_input';
import {
  getFieldFromFilter,
  getFilterableFields,
  getFilterParams,
  getIndexPatternFromFilter,
  getOperatorFromFilter,
  getQueryDslFromFilter,
} from './lib/filter_editor_utils';
import { Operator } from './lib/filter_operators';
import { OperatorInput } from './operator_input';
import { PhraseValueInput } from './phrase_value_input';
import { PhrasesValuesInput } from './phrases_values_input';

interface Props {
  filter: MetaFilter;
  indexPatterns: IndexPattern[];
  onSubmit: (filter: MetaFilter) => void;
  onCancel: () => void;
}

interface State {
  selectedField?: IndexPatternField;
  selectedOperator?: Operator;
  params: any;
  useCustomLabel: boolean;
  customLabel: string | null;
  queryDsl: string;
  isCustomEditorOpen: boolean;
}

export class FilterEditor extends Component<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = {
      selectedField: this.getSelectedField(),
      selectedOperator: this.getSelectedOperator(),
      params: getFilterParams(props.filter),
      useCustomLabel: props.filter.meta.alias !== null,
      customLabel: props.filter.meta.alias,
      queryDsl: JSON.stringify(getQueryDslFromFilter(props.filter), null, 2),
      isCustomEditorOpen: this.isUnknownFilterType(),
    };
  }

  public render() {
    return (
      <div>
        <EuiPopoverTitle>
          <EuiFlexGroup alignItems="baseline">
            <EuiFlexItem>Edit filter</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" onClick={this.toggleCustomEditor}>
                Edit as Query DSL
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>

        {this.state.isCustomEditorOpen ? this.renderCustomEditor() : this.renderRegularEditor()}

        <EuiSpacer size="m" />

        <EuiSwitch
          label="Create custom label?"
          checked={this.state.useCustomLabel}
          onChange={this.onCustomLabelSwitchChange}
        />

        {this.state.useCustomLabel && (
          <div>
            <EuiSpacer size="m" />
            <EuiFormRow label="Custom label">
              <EuiFieldText
                value={`${this.state.customLabel}`}
                onChange={this.onCustomLabelChange}
              />
            </EuiFormRow>
          </div>
        )}

        <EuiSpacer size="m" />

        <EuiFlexGroup direction="rowReverse" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={this.onSubmit}>
              Save
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="right" onClick={this.props.onCancel}>
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
      </div>
    );
  }

  private renderRegularEditor() {
    return (
      <div>
        <EuiFlexGroup>
          <EuiFlexItem style={{ maxWidth: '188px' }}>
            <FieldInput
              options={this.getFieldOptions()}
              value={this.state.selectedField}
              onChange={this.onFieldChange}
            />
          </EuiFlexItem>
          <EuiFlexItem style={{ maxWidth: '188px' }}>
            <OperatorInput
              field={this.state.selectedField}
              value={this.state.selectedOperator}
              onChange={this.onOperatorChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <div>{this.renderParamsEditor()}</div>
      </div>
    );
  }

  private renderCustomEditor() {
    return (
      <EuiFormRow label="Value">
        <EuiCodeEditor
          value={this.state.queryDsl}
          onChange={this.onQueryDslChange}
          mode="json"
          width="400"
        />
      </EuiFormRow>
    );
  }

  private renderParamsEditor() {
    const indexPattern = this.getSelectedIndexPattern();
    if (!indexPattern || !this.state.selectedOperator) {
      return '';
    }

    switch (this.state.selectedOperator.type) {
      case 'exists':
        return '';
      case 'phrase':
        return (
          <PhraseValueInput
            indexPattern={indexPattern}
            field={this.state.selectedField}
            value={this.state.params}
            onChange={this.onParamsChange}
          />
        );
      case 'phrases':
        return (
          <PhrasesValuesInput
            indexPattern={indexPattern}
            field={this.state.selectedField}
            values={this.state.params}
            onChange={this.onParamsChange}
          />
        );
    }
  }

  private toggleCustomEditor = () => {
    const isCustomEditorOpen = !this.state.isCustomEditorOpen;
    this.setState({ isCustomEditorOpen });
  };

  private isUnknownFilterType() {
    const { type } = this.props.filter.meta;
    return !!type && !['phrase', 'phrases', 'range', 'exists'].includes(type);
  }

  private getFieldOptions() {
    return getFilterableFields(this.props.indexPatterns);
  }

  private getSelectedIndexPattern() {
    return getIndexPatternFromFilter(this.props.filter, this.props.indexPatterns);
  }

  private getSelectedField() {
    const indexPattern = this.getSelectedIndexPattern();
    return indexPattern && getFieldFromFilter(this.props.filter as FieldFilter, indexPattern);
  }

  private getSelectedOperator() {
    return getOperatorFromFilter(this.props.filter);
  }

  private onFieldChange = (selectedField?: IndexPatternField) => {
    const selectedOperator = undefined;
    const params = undefined;
    this.setState({ selectedField, selectedOperator, params });
  };

  private onOperatorChange = (selectedOperator?: Operator) => {
    // Only reset params when the operator type changes
    const params =
      get(this.state.selectedOperator, 'type') === get(selectedOperator, 'type')
        ? this.state.params
        : undefined;
    this.setState({ selectedOperator, params });
  };

  private onCustomLabelSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const useCustomLabel = event.target.checked;
    const customLabel = event.target.checked ? '' : null;
    this.setState({ useCustomLabel, customLabel });
  };

  private onCustomLabelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const customLabel = event.target.value;
    this.setState({ customLabel });
  };

  private onParamsChange = (params: any) => {
    this.setState({ params });
  };

  private onQueryDslChange = (queryDsl: string) => {
    this.setState({ queryDsl });
  };

  private onSubmit = () => {
    const filter: MetaFilter | null = this.state.isCustomEditorOpen
      ? this.buildCustomFilter()
      : this.buildFilter();

    if (filter === null) {
      throw new Error('Cannot call onSubmit with empty filter');
    }

    if (!this.state.isCustomEditorOpen) {
      filter.meta.negate = get(this.state.selectedOperator, 'negate') || false;
    }

    filter.meta.alias = this.state.useCustomLabel ? this.state.customLabel : null;
    filter.$state = {
      store: this.props.filter.$state.store,
    };
    this.props.onSubmit(filter);
  };

  private buildFilter(): MetaFilter | null {
    const { selectedField, selectedOperator, params } = this.state;
    const indexPattern = this.getSelectedIndexPattern();
    if (!selectedField || !selectedOperator || !indexPattern) {
      return null;
    }
    switch (selectedOperator.type) {
      case 'phrase':
        return buildPhraseFilter(selectedField, params, indexPattern);
      case 'phrases':
        return buildPhrasesFilter(selectedField, params, indexPattern);
      case 'range':
        const newParams = { gte: params.range.from, lt: params.range.to };
        return buildRangeFilter(selectedField, newParams, indexPattern);
      case 'exists':
        return buildExistsFilter(selectedField, indexPattern);
      case 'query':
        return buildQueryFilter(params.query, indexPattern.id);
      default:
        throw new Error(`Unknown operator type: ${selectedOperator.type}`);
    }
  }

  private buildCustomFilter(): MetaFilter {
    const { negate, index } = this.props.filter.meta;
    const newIndex = index || this.props.indexPatterns[0].id;
    const customFilter = JSON.parse(this.state.queryDsl);
    return { ...customFilter, meta: { negate, index: newIndex } };
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  // @ts-ignore
  EuiCodeEditor,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { get } from 'lodash';
import React, { Component } from 'react';
import { GenericComboBox, GenericComboBoxProps } from './generic_combo_box';
import {
  getFieldFromFilter,
  getFilterableFields,
  getOperatorFromFilter,
  getOperatorOptions,
  isFilterValid,
} from './lib/filter_editor_utils';
import { Operator } from './lib/filter_operators';
import { PhraseValueInput } from './phrase_value_input';
import { PhrasesValuesInput } from './phrases_values_input';
import { RangeValueInput } from './range_value_input';
import { IIndexPattern, IFieldType } from '../../..';
import {
  Filter,
  getIndexPatternFromFilter,
  FieldFilter,
  buildFilter,
  buildCustomFilter,
  cleanFilter,
  getFilterParams,
} from '../../../../common';

export interface Props {
  filter: Filter;
  indexPatterns: IIndexPattern[];
  onSubmit: (filter: Filter) => void;
  onCancel: () => void;
  intl: InjectedIntl;
}

interface State {
  selectedIndexPattern?: IIndexPattern;
  selectedField?: IFieldType;
  selectedOperator?: Operator;
  params: any;
  useCustomLabel: boolean;
  customLabel: string | null;
  queryDsl: string;
  isCustomEditorOpen: boolean;
}

class FilterEditorUI extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      selectedIndexPattern: this.getIndexPatternFromFilter(),
      selectedField: this.getFieldFromFilter(),
      selectedOperator: this.getSelectedOperator(),
      params: getFilterParams(props.filter),
      useCustomLabel: props.filter.meta.alias !== null,
      customLabel: props.filter.meta.alias,
      queryDsl: JSON.stringify(cleanFilter(props.filter), null, 2),
      isCustomEditorOpen: this.isUnknownFilterType(),
    };
  }

  public render() {
    return (
      <div>
        <EuiPopoverTitle paddingSize="m">
          <EuiFlexGroup alignItems="baseline" responsive={false}>
            <EuiFlexItem>
              <FormattedMessage
                id="data.filter.filterEditor.editFilterPopupTitle"
                defaultMessage="Edit filter"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="filterEditor__hiddenItem" />
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                data-test-subj="editQueryDSL"
                onClick={this.toggleCustomEditor}
              >
                {this.state.isCustomEditorOpen ? (
                  <FormattedMessage
                    id="data.filter.filterEditor.editFilterValuesButtonLabel"
                    defaultMessage="Edit filter values"
                  />
                ) : (
                  <FormattedMessage
                    id="data.filter.filterEditor.editQueryDslButtonLabel"
                    defaultMessage="Edit as Query DSL"
                  />
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>

        <div className="globalFilterItem__editorForm">
          <EuiForm>
            {this.renderIndexPatternInput()}

            {this.state.isCustomEditorOpen ? this.renderCustomEditor() : this.renderRegularEditor()}

            <EuiSpacer size="m" />

            <EuiSwitch
              id="filterEditorCustomLabelSwitch"
              data-test-subj="createCustomLabel"
              label={this.props.intl.formatMessage({
                id: 'data.filter.filterEditor.createCustomLabelSwitchLabel',
                defaultMessage: 'Create custom label?',
              })}
              checked={this.state.useCustomLabel}
              onChange={this.onCustomLabelSwitchChange}
            />

            {this.state.useCustomLabel && (
              <div>
                <EuiSpacer size="m" />
                <EuiFormRow
                  label={this.props.intl.formatMessage({
                    id: 'data.filter.filterEditor.createCustomLabelInputLabel',
                    defaultMessage: 'Custom label',
                  })}
                  fullWidth
                >
                  <EuiFieldText
                    value={`${this.state.customLabel}`}
                    onChange={this.onCustomLabelChange}
                    fullWidth
                  />
                </EuiFormRow>
              </div>
            )}

            <EuiSpacer size="m" />

            <EuiFlexGroup direction="rowReverse" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={this.onSubmit}
                  isDisabled={!this.isFilterValid()}
                  data-test-subj="saveFilter"
                >
                  <FormattedMessage
                    id="data.filter.filterEditor.saveButtonLabel"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  flush="right"
                  onClick={this.props.onCancel}
                  data-test-subj="cancelSaveFilter"
                >
                  <FormattedMessage
                    id="data.filter.filterEditor.cancelButtonLabel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem />
            </EuiFlexGroup>
          </EuiForm>
        </div>
      </div>
    );
  }

  private renderIndexPatternInput() {
    if (
      this.props.indexPatterns.length <= 1 &&
      this.props.indexPatterns.find(
        (indexPattern) => indexPattern === this.getIndexPatternFromFilter()
      )
    ) {
      /**
       * Don't render the index pattern selector if there's just one \ zero index patterns
       * and if the index pattern the filter was LOADED with is in the indexPatterns list.
       **/

      return '';
    }
    const { selectedIndexPattern } = this.state;
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={this.props.intl.formatMessage({
              id: 'data.filter.filterEditor.indexPatternSelectLabel',
              defaultMessage: 'Index Pattern',
            })}
          >
            <IndexPatternComboBox
              fullWidth
              placeholder={this.props.intl.formatMessage({
                id: 'data.filter.filterBar.indexPatternSelectPlaceholder',
                defaultMessage: 'Select an index pattern',
              })}
              options={this.props.indexPatterns}
              selectedOptions={selectedIndexPattern ? [selectedIndexPattern] : []}
              getLabel={(indexPattern) => indexPattern.title}
              onChange={this.onIndexPatternChange}
              singleSelection={{ asPlainText: true }}
              isClearable={false}
              data-test-subj="filterIndexPatternsSelect"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private renderRegularEditor() {
    return (
      <div>
        <EuiFlexGroup responsive={true} gutterSize="s">
          <EuiFlexItem grow={2}>{this.renderFieldInput()}</EuiFlexItem>
          <EuiFlexItem grow={false} style={{ flexBasis: 160 }}>
            {this.renderOperatorInput()}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <div data-test-subj="filterParams">{this.renderParamsEditor()}</div>
      </div>
    );
  }

  private renderFieldInput() {
    const { selectedIndexPattern, selectedField } = this.state;
    const fields = selectedIndexPattern ? getFilterableFields(selectedIndexPattern) : [];

    return (
      <EuiFormRow
        fullWidth
        label={this.props.intl.formatMessage({
          id: 'data.filter.filterEditor.fieldSelectLabel',
          defaultMessage: 'Field',
        })}
      >
        <FieldComboBox
          fullWidth
          id="fieldInput"
          isDisabled={!selectedIndexPattern}
          placeholder={this.props.intl.formatMessage({
            id: 'data.filter.filterEditor.fieldSelectPlaceholder',
            defaultMessage: 'Select a field first',
          })}
          options={fields}
          selectedOptions={selectedField ? [selectedField] : []}
          getLabel={(field) => field.name}
          onChange={this.onFieldChange}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          data-test-subj="filterFieldSuggestionList"
        />
      </EuiFormRow>
    );
  }

  private renderOperatorInput() {
    const { selectedField, selectedOperator } = this.state;
    const operators = selectedField ? getOperatorOptions(selectedField) : [];
    return (
      <EuiFormRow
        fullWidth
        label={this.props.intl.formatMessage({
          id: 'data.filter.filterEditor.operatorSelectLabel',
          defaultMessage: 'Operator',
        })}
      >
        <OperatorComboBox
          fullWidth
          isDisabled={!selectedField}
          placeholder={
            selectedField
              ? this.props.intl.formatMessage({
                  id: 'data.filter.filterEditor.operatorSelectPlaceholderSelect',
                  defaultMessage: 'Select',
                })
              : this.props.intl.formatMessage({
                  id: 'data.filter.filterEditor.operatorSelectPlaceholderWaiting',
                  defaultMessage: 'Waiting',
                })
          }
          options={operators}
          selectedOptions={selectedOperator ? [selectedOperator] : []}
          getLabel={({ message }) => message}
          onChange={this.onOperatorChange}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          data-test-subj="filterOperatorList"
        />
      </EuiFormRow>
    );
  }

  private renderCustomEditor() {
    return (
      <EuiFormRow
        fullWidth
        label={i18n.translate('data.filter.filterEditor.queryDslLabel', {
          defaultMessage: 'Elasticsearch Query DSL',
        })}
      >
        <EuiCodeEditor
          value={this.state.queryDsl}
          onChange={this.onQueryDslChange}
          mode="json"
          width="100%"
          height="250px"
          data-test-subj="customEditorInput"
        />
      </EuiFormRow>
    );
  }

  private renderParamsEditor() {
    const indexPattern = this.state.selectedIndexPattern;
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
            data-test-subj="phraseValueInput"
            fullWidth
          />
        );
      case 'phrases':
        return (
          <PhrasesValuesInput
            indexPattern={indexPattern}
            field={this.state.selectedField}
            values={this.state.params}
            onChange={this.onParamsChange}
            fullWidth
          />
        );
      case 'range':
        return (
          <RangeValueInput
            field={this.state.selectedField}
            value={this.state.params}
            onChange={this.onParamsChange}
            fullWidth
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

  private getIndexPatternFromFilter() {
    return getIndexPatternFromFilter(this.props.filter, this.props.indexPatterns);
  }

  private getFieldFromFilter() {
    const indexPattern = this.getIndexPatternFromFilter();
    return indexPattern && getFieldFromFilter(this.props.filter as FieldFilter, indexPattern);
  }

  private getSelectedOperator() {
    return getOperatorFromFilter(this.props.filter);
  }

  private isFilterValid() {
    const {
      isCustomEditorOpen,
      queryDsl,
      selectedIndexPattern: indexPattern,
      selectedField: field,
      selectedOperator: operator,
      params,
    } = this.state;

    if (isCustomEditorOpen) {
      try {
        const queryDslJson = JSON.parse(queryDsl);
        return Object.keys(queryDslJson).length > 0;
      } catch (e) {
        return false;
      }
    }

    return isFilterValid(indexPattern, field, operator, params);
  }

  private onIndexPatternChange = ([selectedIndexPattern]: IIndexPattern[]) => {
    const selectedField = undefined;
    const selectedOperator = undefined;
    const params = undefined;
    this.setState({ selectedIndexPattern, selectedField, selectedOperator, params });
  };

  private onFieldChange = ([selectedField]: IFieldType[]) => {
    const selectedOperator = undefined;
    const params = undefined;
    this.setState({ selectedField, selectedOperator, params });
  };

  private onOperatorChange = ([selectedOperator]: Operator[]) => {
    // Only reset params when the operator type changes
    const params =
      get(this.state.selectedOperator, 'type') === get(selectedOperator, 'type')
        ? this.state.params
        : undefined;
    this.setState({ selectedOperator, params });
  };

  private onCustomLabelSwitchChange = (event: EuiSwitchEvent) => {
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
    const {
      selectedIndexPattern: indexPattern,
      selectedField: field,
      selectedOperator: operator,
      params,
      useCustomLabel,
      customLabel,
      isCustomEditorOpen,
      queryDsl,
    } = this.state;

    const { $state } = this.props.filter;
    if (!$state || !$state.store) {
      return; // typescript validation
    }
    const alias = useCustomLabel ? customLabel : null;

    if (isCustomEditorOpen) {
      const { index, disabled, negate } = this.props.filter.meta;
      const newIndex = index || this.props.indexPatterns[0].id!;
      const body = JSON.parse(queryDsl);
      const filter = buildCustomFilter(newIndex, body, disabled, negate, alias, $state.store);
      this.props.onSubmit(filter);
    } else if (indexPattern && field && operator) {
      const filter = buildFilter(
        indexPattern,
        field,
        operator.type,
        operator.negate,
        this.props.filter.meta.disabled,
        params ?? '',
        alias,
        $state.store
      );
      this.props.onSubmit(filter);
    }
  };
}

function IndexPatternComboBox(props: GenericComboBoxProps<IIndexPattern>) {
  return GenericComboBox(props);
}

function FieldComboBox(props: GenericComboBoxProps<IFieldType>) {
  return GenericComboBox(props);
}

function OperatorComboBox(props: GenericComboBoxProps<Operator>) {
  return GenericComboBox(props);
}

export const FilterEditor = injectI18n(FilterEditorUI);

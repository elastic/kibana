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
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import {
  Filter,
  FieldFilter,
  buildFilter,
  buildCustomFilter,
  cleanFilter,
  getFilterParams,
} from '@kbn/es-query';
import { get } from 'lodash';
import React, { Component } from 'react';
import { XJsonLang } from '@kbn/monaco';
import { DataView, IFieldType } from '@kbn/data-views-plugin/common';
import { getIndexPatternFromFilter } from '@kbn/data-plugin/public';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
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

export interface Props {
  filter: Filter;
  indexPatterns: DataView[];
  onSubmit: (filter: Filter) => void;
  onCancel: () => void;
  intl: InjectedIntl;
  timeRangeForSuggestionsOverride?: boolean;
  mode?: 'edit' | 'add';
}

interface State {
  selectedIndexPattern?: DataView;
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
      customLabel: props.filter.meta.alias || '',
      queryDsl: JSON.stringify(cleanFilter(props.filter), null, 2),
      isCustomEditorOpen: this.isUnknownFilterType(),
    };
  }

  public render() {
    // TODO: Hook up "Add vs Edit" panel titles
    const panelTitleAdd = i18n.translate('unifiedSearch.filter.filterEditor.addFilterPopupTitle', {
      defaultMessage: 'Add filter',
    });
    const panelTitleEdit = i18n.translate(
      'unifiedSearch.filter.filterEditor.editFilterPopupTitle',
      {
        defaultMessage: 'Edit filter',
      }
    );

    // TODO: Hook up "Add vs Update" button labels
    const addButtonLabel = i18n.translate('unifiedSearch.filter.filterEditor.addButtonLabel', {
      defaultMessage: 'Add filter',
    });
    const updateButtonLabel = i18n.translate(
      'unifiedSearch.filter.filterEditor.updateButtonLabel',
      {
        defaultMessage: 'Update filter',
      }
    );

    return (
      <div>
        <EuiPopoverTitle paddingSize="s">
          <EuiFlexGroup alignItems="baseline" responsive={false}>
            <EuiFlexItem>{this.props.mode === 'add' ? panelTitleAdd : panelTitleEdit}</EuiFlexItem>
            <EuiFlexItem grow={false} className="filterEditor__hiddenItem" />
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                data-test-subj="editQueryDSL"
                onClick={this.toggleCustomEditor}
              >
                {this.state.isCustomEditorOpen ? (
                  <FormattedMessage
                    id="unifiedSearch.filter.filterEditor.editFilterValuesButtonLabel"
                    defaultMessage="Edit filter values"
                  />
                ) : (
                  <FormattedMessage
                    id="unifiedSearch.filter.filterEditor.editQueryDslButtonLabel"
                    defaultMessage="Edit as Query DSL"
                  />
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>

        <EuiForm>
          <div className="globalFilterItem__editorForm">
            {this.renderIndexPatternInput()}

            {this.state.isCustomEditorOpen ? this.renderCustomEditor() : this.renderRegularEditor()}

            <EuiSpacer size="m" />

            <EuiSwitch
              id="filterEditorCustomLabelSwitch"
              data-test-subj="createCustomLabel"
              label={this.props.intl.formatMessage({
                id: 'unifiedSearch.filter.filterEditor.createCustomLabelSwitchLabel',
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
                    id: 'unifiedSearch.filter.filterEditor.createCustomLabelInputLabel',
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
          </div>

          <EuiPopoverFooter paddingSize="s">
            <EuiFlexGroup direction="rowReverse" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={this.onSubmit}
                  isDisabled={!this.isFilterValid()}
                  data-test-subj="saveFilter"
                >
                  {this.props.mode === 'add' ? addButtonLabel : updateButtonLabel}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  flush="right"
                  onClick={this.props.onCancel}
                  data-test-subj="cancelSaveFilter"
                >
                  <FormattedMessage
                    id="unifiedSearch.filter.filterEditor.cancelButtonLabel"
                    defaultMessage="Cancel"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem />
            </EuiFlexGroup>
          </EuiPopoverFooter>
        </EuiForm>
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
      <>
        <EuiFormRow
          fullWidth
          label={this.props.intl.formatMessage({
            id: 'unifiedSearch.filter.filterEditor.indexPatternSelectLabel',
            defaultMessage: 'Index Pattern',
          })}
        >
          <IndexPatternComboBox
            fullWidth
            placeholder={this.props.intl.formatMessage({
              id: 'unifiedSearch.filter.filterBar.indexPatternSelectPlaceholder',
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
        <EuiSpacer size="s" />
      </>
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
          id: 'unifiedSearch.filter.filterEditor.fieldSelectLabel',
          defaultMessage: 'Field',
        })}
      >
        <FieldComboBox
          fullWidth
          id="fieldInput"
          isDisabled={!selectedIndexPattern}
          placeholder={this.props.intl.formatMessage({
            id: 'unifiedSearch.filter.filterEditor.fieldSelectPlaceholder',
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
          id: 'unifiedSearch.filter.filterEditor.operatorSelectLabel',
          defaultMessage: 'Operator',
        })}
      >
        <OperatorComboBox
          fullWidth
          isDisabled={!selectedField}
          placeholder={
            selectedField
              ? this.props.intl.formatMessage({
                  id: 'unifiedSearch.filter.filterEditor.operatorSelectPlaceholderSelect',
                  defaultMessage: 'Select',
                })
              : this.props.intl.formatMessage({
                  id: 'unifiedSearch.filter.filterEditor.operatorSelectPlaceholderWaiting',
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
        label={i18n.translate('unifiedSearch.filter.filterEditor.queryDslLabel', {
          defaultMessage: 'Elasticsearch Query DSL',
        })}
      >
        <CodeEditor
          languageId={XJsonLang.ID}
          width="100%"
          height={'250px'}
          value={this.state.queryDsl}
          onChange={this.onQueryDslChange}
          data-test-subj="customEditorInput"
          aria-label={i18n.translate('unifiedSearch.filter.filterEditor.queryDslAriaLabel', {
            defaultMessage: 'Elasticsearch Query DSL editor',
          })}
        />
      </EuiFormRow>
    );
  }

  private renderParamsEditor() {
    const indexPattern = this.state.selectedIndexPattern;
    if (!indexPattern || !this.state.selectedOperator || !this.state.selectedField) {
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
            timeRangeForSuggestionsOverride={this.props.timeRangeForSuggestionsOverride}
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
            timeRangeForSuggestionsOverride={this.props.timeRangeForSuggestionsOverride}
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

  private onIndexPatternChange = ([selectedIndexPattern]: DataView[]) => {
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
      const { index, disabled = false, negate = false } = this.props.filter.meta;
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
        this.props.filter.meta.disabled ?? false,
        params ?? '',
        alias,
        $state.store
      );
      this.props.onSubmit(filter);
    }
  };
}

function IndexPatternComboBox(props: GenericComboBoxProps<DataView>) {
  return GenericComboBox(props);
}

function FieldComboBox(props: GenericComboBoxProps<IFieldType>) {
  return GenericComboBox(props);
}

function OperatorComboBox(props: GenericComboBoxProps<Operator>) {
  return GenericComboBox(props);
}

export const FilterEditor = injectI18n(FilterEditorUI);

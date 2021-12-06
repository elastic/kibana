/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, ReactNode } from 'react';
import {
  Filter,
  FieldFilter,
  buildFilter,
  buildCustomFilter,
  cleanFilter,
  getFilterParams,
} from '@kbn/es-query';
import {
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiModal,
  EuiModalHeaderTitle,
  EuiModalHeader,
  EuiModalBody,
  EuiTabs,
  EuiTab,
  EuiForm,
  EuiSpacer,
  EuiHorizontalRule,
  EuiPanel,
} from '@elastic/eui';
import { XJsonLang } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '../../../../kibana_react/public';
import { getIndexPatternFromFilter } from '../../query';
import {
  getFieldFromFilter,
  getFilterableFields,
  getOperatorFromFilter,
  getOperatorOptions,
  isFilterValid,
} from '../filter_bar/filter_editor/lib/filter_editor_utils';
import { Operator } from '../filter_bar/filter_editor/lib/filter_operators';

import {
  GenericComboBox,
  GenericComboBoxProps,
} from '../filter_bar/filter_editor/generic_combo_box';
import { PhraseValueInput } from '../filter_bar/filter_editor/phrase_value_input';
import { PhrasesValuesInput } from '../filter_bar/filter_editor/phrases_values_input';
import { RangeValueInput } from '../filter_bar/filter_editor/range_value_input';

import { IIndexPattern, IFieldType } from '../..';

const tabs = [
  {
    type: 'quick_form',
    label: i18n.translate('data.filter.filterEditor.quickFormLabel', {
      defaultMessage: 'Quick form',
    }),
  },
  {
    type: 'query_builder',
    label: i18n.translate('data.filter.filterEditor.queryBuilderLabel', {
      defaultMessage: 'Query builder',
    }),
  },
  {
    type: 'saved_filters',
    label: i18n.translate('data.filter.filterEditor.savedFiltersLabel', {
      defaultMessage: 'Saved filters',
    }),
  },
];

export function AddFilterModal({
  onSubmit,
  onCancel,
  filter,
  indexPatterns,
  timeRangeForSuggestionsOverride,
  savedQueryManagement,
}: {
  onSubmit: (filter: Filter) => void;
  onCancel: () => void;
  filter: Filter;
  indexPatterns: IIndexPattern[];
  timeRangeForSuggestionsOverride?: boolean;
  savedQueryManagement?: JSX.Element;
}) {
  const [selectedIndexPattern, setSelectedIndexPattern] = useState(
    getIndexPatternFromFilter(filter, indexPatterns)
  );
  const [selectedField, setSelectedField] = useState<IFieldType | undefined>(undefined);
  const [selectedOperator, setSelectedOperator] = useState<Operator | undefined>(undefined);
  const [filterParams, setFilterParams] = useState(getFilterParams(filter));
  const [addFilterMode, setAddFilterMode] = useState<string>(tabs[0].type);
  const [queryDsl, setQueryDsl] = useState<string>(JSON.stringify(cleanFilter(filter), null, 2));

  const onIndexPatternChange = ([selectedPattern]: IIndexPattern[]) => {
    setSelectedIndexPattern(selectedPattern);
    setSelectedField(undefined);
    setSelectedOperator(undefined);
    setFilterParams(undefined);
  };

  const onFieldChange = ([field]: IFieldType[]) => {
    setSelectedField(field);
    setSelectedOperator(undefined);
    setFilterParams(undefined);
  };

  const onOperatorChange = ([operator]: Operator[]) => {
    // Only reset params when the operator type changes
    const params = selectedOperator?.type === operator.type ? filterParams : undefined;
    setSelectedOperator(operator);
    setFilterParams(params);
  };

  const renderIndexPatternInput = () => {
    if (
      indexPatterns.length <= 1 &&
      indexPatterns.find((indexPattern) => indexPattern === selectedIndexPattern)
    ) {
      /**
       * Don't render the index pattern selector if there's just one \ zero index patterns
       * and if the index pattern the filter was LOADED with is in the indexPatterns list.
       **/

      return '';
    }
    return (
      <EuiFormRow
        fullWidth
        display="columnCompressed"
        label={i18n.translate('data.filter.filterEditor.indexPatternSelectLabel', {
          defaultMessage: 'Index pattern',
        })}
      >
        <GenericComboBox
          fullWidth
          compressed
          placeholder={i18n.translate('data.filter.filterEditor.selectIndexPatternLabel', {
            defaultMessage: 'Select an index pattern',
          })}
          options={indexPatterns}
          selectedOptions={selectedIndexPattern ? [selectedIndexPattern] : []}
          getLabel={(indexPattern: IIndexPattern) => indexPattern.title}
          onChange={onIndexPatternChange}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          data-test-subj="filterIndexPatternsSelect"
        />
      </EuiFormRow>
    );
  };

  const renderFieldInput = () => {
    const fields = selectedIndexPattern ? getFilterableFields(selectedIndexPattern) : [];
    return (
      <EuiFormRow
        fullWidth
        display="columnCompressed"
        label={i18n.translate('data.filter.filterEditor.fieldSelectLabel', {
          defaultMessage: 'Field',
        })}
      >
        <GenericComboBox
          fullWidth
          compressed
          id="fieldInput"
          isDisabled={!selectedIndexPattern}
          placeholder={i18n.translate('data.filter.filterEditor.fieldSelectPlaceholder', {
            defaultMessage: 'Select a field first',
          })}
          options={fields}
          selectedOptions={selectedField ? [selectedField] : []}
          getLabel={(field: IFieldType) => field.name}
          onChange={onFieldChange}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          data-test-subj="filterFieldSuggestionList"
        />
      </EuiFormRow>
    );
  };

  const renderOperatorInput = () => {
    const operators = selectedField ? getOperatorOptions(selectedField) : [];
    return (
      <EuiFormRow
        fullWidth
        display="columnCompressed"
        label={i18n.translate('data.filter.filterEditor.operatorSelectLabel', {
          defaultMessage: 'Operator',
        })}
      >
        <GenericComboBox
          fullWidth
          compressed
          isDisabled={!selectedField}
          placeholder={
            selectedField
              ? i18n.translate('data.filter.filterEditor.operatorSelectPlaceholderSelect', {
                  defaultMessage: 'Select',
                })
              : i18n.translate('data.filter.filterEditor.operatorSelectPlaceholderWaiting', {
                  defaultMessage: 'Waiting',
                })
          }
          options={operators}
          selectedOptions={selectedOperator ? [selectedOperator] : []}
          getLabel={({ message }) => message}
          onChange={onOperatorChange}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          data-test-subj="filterOperatorList"
        />
      </EuiFormRow>
    );
  };

  const renderParamsEditor = () => {
    if (!selectedIndexPattern || !selectedOperator) {
      // return '';
    }

    switch (selectedOperator?.type) {
      case 'exists':
        return '';
      case 'phrases':
        return (
          <PhrasesValuesInput
            indexPattern={selectedIndexPattern}
            field={selectedField}
            values={filterParams}
            onChange={setFilterParams}
            timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
            fullWidth
            compressed
          />
        );
      case 'range':
        return (
          <RangeValueInput
            field={selectedField}
            value={filterParams}
            onChange={setFilterParams}
            fullWidth
            compressed
          />
        );
      default:
        return (
          <PhraseValueInput
            disabled={!selectedIndexPattern || !selectedOperator}
            indexPattern={selectedIndexPattern}
            field={selectedField}
            value={filterParams}
            onChange={setFilterParams}
            data-test-subj="phraseValueInput"
            timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
            fullWidth
            compressed
          />
        );
    }
  };

  const renderCustomEditor = () => {
    return (
      <EuiFormRow
        fullWidth
        label={i18n.translate('data.filter.filterEditor.queryDslLabel', {
          defaultMessage: 'Elasticsearch Query DSL',
        })}
      >
        <CodeEditor
          languageId={XJsonLang.ID}
          width="100%"
          height={'250px'}
          value={queryDsl}
          onChange={setQueryDsl}
          data-test-subj="customEditorInput"
          aria-label={i18n.translate('data.filter.filterEditor.queryDslAriaLabel', {
            defaultMessage: 'Elasticsearch Query DSL editor',
          })}
        />
      </EuiFormRow>
    );
  };

  const onAddFilter = () => {
    const { $state } = filter;
    if (!$state || !$state.store) {
      return; // typescript validation
    }
    // const alias = useCustomLabel ? customLabel : null;
    const alias = null;
    if (addFilterMode === 'query_builder') {
      const { index, disabled = false, negate = false } = filter.meta;
      const newIndex = index || indexPatterns[0].id!;
      const body = JSON.parse(queryDsl);
      const builtCustomFilter = buildCustomFilter(
        newIndex,
        body,
        disabled,
        negate,
        alias,
        $state.store
      );
      onSubmit(builtCustomFilter);
    } else if (selectedIndexPattern && selectedField && selectedOperator) {
      const builtFilter = buildFilter(
        selectedIndexPattern,
        selectedField,
        selectedOperator.type,
        selectedOperator.negate,
        filter.meta.disabled ?? false,
        filterParams ?? '',
        alias,
        $state.store
      );
      onSubmit(builtFilter);
    }
  };

  return (
    <EuiModal maxWidth={700} onClose={onCancel} style={{ width: 700 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h3>
            {i18n.translate('data.filter.addFilterModal.headerTitle', {
              defaultMessage: 'Add filter',
            })}
          </h3>
        </EuiModalHeaderTitle>
        {renderIndexPatternInput()}
      </EuiModalHeader>

      <EuiModalHeader style={{ paddingBottom: 0, paddingTop: 0 }}>
        <EuiTabs size="m" bottomBorder={false}>
          {tabs.map(({ label, type }) => (
            <EuiTab
              key={type}
              isSelected={type === addFilterMode}
              onClick={() => setAddFilterMode(type)}
              data-test-subj={`${type}FilterMode`}
            >
              {label}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiModalHeader>

      <EuiHorizontalRule margin="none" />

      <EuiModalBody>
        <EuiForm>
          {addFilterMode === 'quick_form' && (
            <EuiPanel color="subdued">
              {renderFieldInput()}
              {renderOperatorInput()}
              <EuiSpacer size="s" />
              <div data-test-subj="filterParams">{renderParamsEditor()}</div>
            </EuiPanel>
          )}
          {addFilterMode === 'query_builder' && renderCustomEditor()}
          {addFilterMode === 'saved_filters' && savedQueryManagement}
        </EuiForm>
      </EuiModalBody>
      <EuiHorizontalRule margin="none" />
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel}>
              {i18n.translate('xpack.lens.palette.saveModal.cancelLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="plusInCircleFilled"
              fill
              onClick={onAddFilter}
              data-test-subj="canvasCustomElementForm-submit"
            >
              {i18n.translate('data.filter.addFilterModal.addFilterBtnLabel', {
                defaultMessage: 'Add filter',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  Filter,
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
  EuiButtonIcon,
} from '@elastic/eui';
import { XJsonLang } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '../../../../kibana_react/public';
import { getIndexPatternFromFilter } from '../../query';
import {
  getFilterableFields,
  getOperatorOptions,
} from '../filter_bar/filter_editor/lib/filter_editor_utils';
import { Operator } from '../filter_bar/filter_editor/lib/filter_operators';

import { GenericComboBox } from '../filter_bar/filter_editor/generic_combo_box';
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

interface FilterGroup {
  field: IFieldType | undefined;
  operator: Operator | undefined;
  value: any;
}

export function AddFilterModal({
  onSubmit,
  onCancel,
  applySavedQueries,
  filter,
  indexPatterns,
  timeRangeForSuggestionsOverride,
  savedQueryManagement,
  initialAddFilterMode,
}: {
  onSubmit: (filters: Filter[]) => void;
  applySavedQueries: () => void;
  onCancel: () => void;
  filter: Filter;
  indexPatterns: IIndexPattern[];
  timeRangeForSuggestionsOverride?: boolean;
  savedQueryManagement?: JSX.Element;
  initialAddFilterMode?: string;
}) {
  const [selectedIndexPattern, setSelectedIndexPattern] = useState(
    getIndexPatternFromFilter(filter, indexPatterns)
  );
  const [addFilterMode, setAddFilterMode] = useState<string>(initialAddFilterMode ?? tabs[0].type);
  const [queryDsl, setQueryDsl] = useState<string>(JSON.stringify(cleanFilter(filter), null, 2));
  const [localFilters, setLocalFilters] = useState<FilterGroup[]>([
    { field: undefined, operator: undefined, value: getFilterParams(filter) },
  ]);

  const onIndexPatternChange = ([selectedPattern]: IIndexPattern[]) => {
    setSelectedIndexPattern(selectedPattern);
    setLocalFilters([{ field: undefined, operator: undefined, value: undefined }]);
  };

  const onFieldChange = ([field]: IFieldType[], localFilterIndex: number) => {
    const updatedLocalFilter = { ...localFilters[localFilterIndex], field };
    setLocalFilters([...localFilters.slice(0, localFilterIndex), updatedLocalFilter]);
  };

  const onOperatorChange = ([operator]: Operator[], localFilterIndex: number) => {
    // Only reset params when the operator type changes
    const params =
      localFilters[localFilterIndex].operator?.type === operator.type
        ? localFilters[localFilterIndex].value
        : undefined;
    const updatedLocalFilter = { ...localFilters[localFilterIndex], operator, value: params };
    setLocalFilters([...localFilters.slice(0, localFilterIndex), updatedLocalFilter]);
  };

  const onParamsChange = (newFilterParams: any, localFilterIndex: number) => {
    const updatedLocalFilter = { ...localFilters[localFilterIndex], value: newFilterParams };
    setLocalFilters([...localFilters.slice(0, localFilterIndex), updatedLocalFilter]);
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

  const renderFieldInput = (localFilterIndex: number) => {
    const fields = selectedIndexPattern ? getFilterableFields(selectedIndexPattern) : [];
    const selectedFieldTemp = localFilters[localFilterIndex].field;
    return (
      <EuiFlexItem>
        <EuiFormRow fullWidth>
          <GenericComboBox
            fullWidth
            compressed
            id="fieldInput"
            isDisabled={!selectedIndexPattern}
            placeholder={i18n.translate('data.filter.filterEditor.fieldSelectPlaceholder', {
              defaultMessage: 'Field',
            })}
            options={fields}
            selectedOptions={selectedFieldTemp ? [selectedFieldTemp] : []}
            getLabel={(field: IFieldType) => field.name}
            onChange={(selected: IFieldType[]) => {
              onFieldChange(selected, localFilterIndex);
            }}
            singleSelection={{ asPlainText: true }}
            isClearable={false}
            data-test-subj="filterFieldSuggestionList"
          />
        </EuiFormRow>
      </EuiFlexItem>
    );
  };

  const renderOperatorInput = (localFilterIndex: number) => {
    const selectedFieldTemp = localFilters[localFilterIndex].field;
    const operators = selectedFieldTemp ? getOperatorOptions(selectedFieldTemp) : [];
    const selectedOperatorTemp = localFilters[localFilterIndex].operator;
    return (
      <EuiFlexItem>
        <EuiFormRow fullWidth>
          <GenericComboBox
            fullWidth
            compressed
            isDisabled={!selectedFieldTemp}
            placeholder={
              selectedFieldTemp
                ? i18n.translate('data.filter.filterEditor.operatorSelectPlaceholderSelect', {
                    defaultMessage: 'Operator',
                  })
                : i18n.translate('data.filter.filterEditor.operatorSelectPlaceholderWaiting', {
                    defaultMessage: 'Waiting',
                  })
            }
            options={operators}
            selectedOptions={selectedOperatorTemp ? [selectedOperatorTemp] : []}
            getLabel={({ message }) => message}
            onChange={(selected: Operator[]) => {
              onOperatorChange(selected, localFilterIndex);
            }}
            singleSelection={{ asPlainText: true }}
            isClearable={false}
            data-test-subj="filterOperatorList"
          />
        </EuiFormRow>
      </EuiFlexItem>
    );
  };

  const renderParamsEditor = (localFilterIndex: number) => {
    const selectedOperatorTemp = localFilters[localFilterIndex].operator;
    const selectedFieldTemp = localFilters[localFilterIndex].field;
    const selectedParamsTemp = localFilters[localFilterIndex].value;
    switch (selectedOperatorTemp?.type) {
      case 'exists':
        return '';
      case 'phrases':
        return (
          <PhrasesValuesInput
            indexPattern={selectedIndexPattern}
            field={selectedFieldTemp}
            values={selectedParamsTemp}
            onChange={(newFilterParams: any) => {
              onParamsChange(newFilterParams, localFilterIndex);
            }}
            timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
            fullWidth
            compressed
          />
        );
      case 'range':
        return (
          <RangeValueInput
            field={selectedFieldTemp}
            value={selectedParamsTemp}
            onChange={(newFilterParams: any) => {
              onParamsChange(newFilterParams, localFilterIndex);
            }}
            fullWidth
            compressed
          />
        );
      default:
        return (
          <PhraseValueInput
            disabled={!selectedIndexPattern || !selectedOperatorTemp}
            indexPattern={selectedIndexPattern}
            field={selectedFieldTemp}
            value={selectedParamsTemp}
            onChange={(newFilterParams: any) => {
              onParamsChange(newFilterParams, localFilterIndex);
            }}
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
      onSubmit([builtCustomFilter]);
    } else if (addFilterMode === 'quick_form' && selectedIndexPattern) {
      const builtFilters = localFilters.map((localFilter) => {
        if (localFilter.field && localFilter.operator) {
          return buildFilter(
            selectedIndexPattern,
            localFilter.field,
            localFilter.operator.type,
            localFilter.operator.negate,
            filter.meta.disabled ?? false,
            localFilter.value ?? '',
            alias,
            $state.store
          );
        }
      });
      if (builtFilters && builtFilters.length) {
        const finalFilters = builtFilters.filter(
          (value) => typeof value !== 'undefined'
        ) as Filter[];
        onSubmit(finalFilters);
      }
    } else if (addFilterMode === 'saved_filters') {
      applySavedQueries();
    }
  };

  return (
    <EuiModal maxWidth={800} onClose={onCancel} style={{ width: 700 }}>
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
          {addFilterMode === 'quick_form' &&
            localFilters.map((localFilter, index) => {
              return (
                <>
                  <EuiFlexGroup>
                    {renderFieldInput(index)}
                    {renderOperatorInput(index)}
                    <EuiSpacer size="s" />
                    <EuiFlexItem data-test-subj="filterParams">
                      {renderParamsEditor(index)}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        display="base"
                        onClick={() => {
                          setLocalFilters([
                            ...localFilters,
                            {
                              field: undefined,
                              operator: undefined,
                              value: undefined,
                            },
                          ]);
                        }}
                        iconType="plus"
                        size="s"
                        aria-label="Add filter group"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="s" />
                </>
              );
            })}
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { groupBy } from 'lodash';
import classNames from 'classnames';
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
  EuiText,
  EuiIcon,
  EuiFieldText,
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

export interface FilterGroup {
  field: IFieldType | undefined;
  operator: Operator | undefined;
  value: any;
  groupId: number;
  id: number;
  relationship?: string;
  subGroupId?: number;
}

export function AddFilterModal({
  onSubmit,
  onMultipleFiltersSubmit,
  onCancel,
  applySavedQueries,
  filter,
  indexPatterns,
  timeRangeForSuggestionsOverride,
  savedQueryManagement,
  initialAddFilterMode,
}: {
  onSubmit: (filters: Filter[]) => void;
  onMultipleFiltersSubmit: (filters: FilterGroup[], buildFilters: Filter[]) => void;
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
  const [customLabel, setCustomLabel] = useState<string>(filter.meta.alias || '');
  const [queryDsl, setQueryDsl] = useState<string>(JSON.stringify(cleanFilter(filter), null, 2));
  const [localFilters, setLocalFilters] = useState<FilterGroup[]>([
    {
      field: undefined,
      operator: undefined,
      value: getFilterParams(filter),
      groupId: 1,
      id: 0,
      subGroupId: 1,
    },
  ]);
  const [groupsCount, setGroupsCount] = useState<number>(1);

  const onIndexPatternChange = ([selectedPattern]: IIndexPattern[]) => {
    setSelectedIndexPattern(selectedPattern);
    setLocalFilters([
      { field: undefined, operator: undefined, value: undefined, groupId: 1, id: 0, subGroupId: 1 },
    ]);
    setGroupsCount(1);
  };

  const onFieldChange = ([field]: IFieldType[], localFilterIndex: number) => {
    const index = localFilters.findIndex((f) => f.id === localFilterIndex);
    const updatedLocalFilter = { ...localFilters[index], field };
    localFilters[index] = updatedLocalFilter;
    setLocalFilters([...localFilters]);
  };

  const onOperatorChange = ([operator]: Operator[], localFilterIndex: number) => {
    const index = localFilters.findIndex((f) => f.id === localFilterIndex);
    // Only reset params when the operator type changes
    const params =
      localFilters[localFilterIndex].operator?.type === operator.type
        ? localFilters[localFilterIndex].value
        : undefined;
    const updatedLocalFilter = { ...localFilters[index], operator, value: params };
    localFilters[index] = updatedLocalFilter;
    setLocalFilters([...localFilters]);
  };

  const onParamsChange = (newFilterParams: any, localFilterIndex: number) => {
    const index = localFilters.findIndex((f) => f.id === localFilterIndex);
    const updatedLocalFilter = { ...localFilters[index], value: newFilterParams };
    localFilters[index] = updatedLocalFilter;
    setLocalFilters([...localFilters]);
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
    const selectedField = localFilters.filter(
      (localFilter) => localFilter.id === localFilterIndex
    )[0]?.field;
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
            selectedOptions={selectedField ? [selectedField] : []}
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
    const selectedField = localFilters.filter(
      (localFilter) => localFilter.id === localFilterIndex
    )[0]?.field;
    const operators = selectedField ? getOperatorOptions(selectedField) : [];
    const selectedOperator = localFilters.filter(
      (localFilter) => localFilter.id === localFilterIndex
    )[0]?.operator;

    return (
      <EuiFlexItem>
        <EuiFormRow fullWidth>
          <GenericComboBox
            fullWidth
            compressed
            isDisabled={!selectedField}
            placeholder={
              selectedField
                ? i18n.translate('data.filter.filterEditor.operatorSelectPlaceholderSelect', {
                    defaultMessage: 'Operator',
                  })
                : i18n.translate('data.filter.filterEditor.operatorSelectPlaceholderWaiting', {
                    defaultMessage: 'Waiting',
                  })
            }
            options={operators}
            selectedOptions={selectedOperator ? [selectedOperator] : []}
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
    const selectedOperator = localFilters.filter(
      (localFilter) => localFilter.id === localFilterIndex
    )[0]?.operator;
    const selectedField = localFilters.filter(
      (localFilter) => localFilter.id === localFilterIndex
    )[0]?.field;
    const selectedParams = localFilters.filter(
      (localFilter) => localFilter.id === localFilterIndex
    )[0]?.value;
    switch (selectedOperator?.type) {
      case 'exists':
        return '';
      case 'phrases':
        return (
          <PhrasesValuesInput
            indexPattern={selectedIndexPattern}
            field={selectedField}
            values={selectedParams}
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
            field={selectedField}
            value={selectedParams}
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
            disabled={!selectedIndexPattern || !selectedOperator}
            indexPattern={selectedIndexPattern}
            field={selectedField}
            value={selectedParams}
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
    const alias = customLabel || null;
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
        // onSubmit(finalFilters);
        onMultipleFiltersSubmit(localFilters, finalFilters);
      }
    } else if (addFilterMode === 'saved_filters') {
      applySavedQueries();
    }
  };

  const renderGroupedFilters = () => {
    const groupedFiltersNew = groupBy(localFilters, 'groupId');
    const GroupComponent: JSX.Element[] = [];
    for (const [groupId, groupedFilters] of Object.entries(groupedFiltersNew)) {
      const filtersInGroup = groupedFilters.length;
      const groupBySubgroups = groupBy(groupedFilters, 'subGroupId');
      const subGroups = [];
      for (const [_, subGroupedFilters] of Object.entries(groupBySubgroups)) {
        subGroups.push(subGroupedFilters);
      }

      const temp = (
        <div
          className={classNames(
            filtersInGroup > 1 && groupsCount > 1 ? 'kbnQueryBar__filterModalGroups' : ''
          )}
        >
          {subGroups.map((subGroup, subGroupIdx) => {
            const classes =
              subGroup.length > 1 && groupsCount > 1
                ? 'kbnQueryBar__filterModalSubGroups'
                : groupsCount === 1 && subGroup.length > 1
                ? 'kbnQueryBar__filterModalGroups'
                : '';
            return (
              <>
                <div className={classNames(classes)}>
                  {subGroup.map((localfilter, index) => {
                    return (
                      <>
                        <EuiFlexGroup alignItems="center">
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="grab" size="s" />
                          </EuiFlexItem>
                          {renderFieldInput(localfilter.id)}
                          {renderOperatorInput(localfilter.id)}
                          <EuiSpacer size="s" />
                          <EuiFlexItem data-test-subj="filterParams">
                            {renderParamsEditor(localfilter.id)}
                          </EuiFlexItem>
                          {subGroup.length < 2 && (
                            <EuiFlexItem grow={false}>
                              <EuiButtonIcon
                                onClick={() => {
                                  const updatedLocalFilter = { ...localfilter, relationship: 'OR' };
                                  const idx = localFilters.findIndex(
                                    (f) => f.id === localfilter.id && f.groupId === Number(groupId)
                                  );
                                  const subGroupId = (localfilter?.subGroupId ?? 0) + 1;
                                  if (subGroup.length < 2) {
                                    localFilters[idx] = updatedLocalFilter;
                                  }
                                  setLocalFilters([
                                    ...localFilters,
                                    {
                                      field: undefined,
                                      operator: undefined,
                                      value: undefined,
                                      relationship: undefined,
                                      groupId: localfilter.groupId,
                                      id: localFilters.length,
                                      subGroupId,
                                    },
                                  ]);
                                }}
                                iconType="returnKey"
                                size="s"
                                aria-label="Add filter group with OR"
                              />
                            </EuiFlexItem>
                          )}
                          <EuiFlexItem grow={false}>
                            <EuiButtonIcon
                              display="base"
                              onClick={() => {
                                const filtersOnGroup = localFilters.filter(
                                  (f) => f.groupId === Number(groupId)
                                );
                                const subGroupId =
                                  filtersOnGroup.length > 2
                                    ? localfilter?.subGroupId ?? 0
                                    : (localfilter?.subGroupId ?? 0) + 1;
                                const updatedLocalFilter = {
                                  ...localfilter,
                                  relationship: 'AND',
                                  subGroupId: filtersOnGroup.length > 1 ? subGroupId : 1,
                                };
                                const idx = localFilters.findIndex(
                                  (f) => f.id === localfilter.id && f.groupId === Number(groupId)
                                );
                                localFilters[idx] = updatedLocalFilter;
                                setLocalFilters([
                                  ...localFilters,
                                  {
                                    field: undefined,
                                    operator: undefined,
                                    value: undefined,
                                    relationship: undefined,
                                    groupId:
                                      filtersOnGroup.length > 1 ? groupsCount : groupsCount + 1,
                                    subGroupId,
                                    id: localFilters.length,
                                  },
                                ]);
                                if (filtersOnGroup.length <= 1) {
                                  setGroupsCount(groupsCount + 1);
                                }
                              }}
                              iconType="plus"
                              size="s"
                              aria-label="Add filter group with AND"
                            />
                          </EuiFlexItem>
                          {localFilters.length > 1 && (
                            <EuiFlexItem grow={false}>
                              <EuiButtonIcon
                                display="base"
                                onClick={() => {
                                  const currentIdx = localFilters.findIndex(
                                    (f) => f.id === localfilter.id
                                  );
                                  if (currentIdx > 0) {
                                    localFilters[currentIdx - 1].relationship = 'AND';
                                  }
                                  const updatedFilters = localFilters.filter(
                                    (_, idx) => idx !== localfilter.id
                                  );
                                  const filtersOnGroup = updatedFilters.filter(
                                    (f) => f.groupId === Number(groupId)
                                  );
                                  if (filtersOnGroup.length < 1) {
                                    setGroupsCount(groupsCount - 1);
                                  }
                                  setLocalFilters(updatedFilters);
                                }}
                                iconType="trash"
                                size="s"
                                color="danger"
                                aria-label="Delete filter group"
                              />
                            </EuiFlexItem>
                          )}
                        </EuiFlexGroup>
                        {localfilter.relationship &&
                          localfilter.relationship === 'OR' &&
                          subGroup.length === 0 && (
                            <>
                              <EuiFlexGroup gutterSize="none">
                                <EuiFlexItem>
                                  <EuiHorizontalRule margin="s" />
                                </EuiFlexItem>
                                <EuiFlexItem grow={false}>
                                  <EuiText
                                    color="subdued"
                                    className="kbnQueryBar__filterModalORText"
                                  >
                                    {' '}
                                    OR{' '}
                                  </EuiText>
                                </EuiFlexItem>
                                <EuiFlexItem>
                                  <EuiHorizontalRule margin="s" />
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </>
                          )}
                      </>
                    );
                  })}
                </div>
                <>
                  {subGroup.length > 0 && subGroupIdx !== subGroups.length - 1 && (
                    <>
                      <EuiFlexGroup gutterSize="none">
                        <EuiFlexItem>
                          <EuiHorizontalRule margin="s" />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText color="subdued" className="kbnQueryBar__filterModalORText">
                            {' '}
                            OR{' '}
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiHorizontalRule margin="s" />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </>
                  )}
                </>
              </>
            );
          })}
        </div>
      );
      GroupComponent.push(temp);
    }
    return GroupComponent;
  };

  return (
    <EuiModal maxWidth={800} onClose={onCancel} className="kbnQueryBar--addFilterModal">
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

      <EuiModalBody className="kbnQueryBar__filterModalWrapper">
        <EuiForm className="kbnQueryBar__filterModalForm">
          {addFilterMode === 'quick_form' && renderGroupedFilters()}
          {addFilterMode === 'query_builder' && renderCustomEditor()}
          {addFilterMode === 'saved_filters' && savedQueryManagement}
        </EuiForm>
      </EuiModalBody>
      <EuiHorizontalRule margin="none" />
      <EuiModalFooter>
        <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd">
          {addFilterMode !== 'saved_filters' && (
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('data.filter.filterEditor.createCustomLabelInputLabel', {
                  defaultMessage: 'Label (optional)',
                })}
                display="columnCompressed"
              >
                <EuiFieldText
                  value={`${customLabel}`}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  compressed
                />
              </EuiFormRow>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
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
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}

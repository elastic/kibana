/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiFlyoutBody,
  EuiCallOut,
  type EuiSwitchEvent,
  EuiPanel,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ISearchGeneric } from '@kbn/search-types';
import ESQLEditor from '@kbn/esql-editor';
import { EsqlControlType } from '@kbn/esql-validation-autocomplete';
import { getIndexPatternFromESQLQuery, getESQLResults } from '@kbn/esql-utils';
import { esqlVariablesService } from '@kbn/esql-variables/common';
import type { ESQLControlState } from '../types';
import {
  Header,
  Footer,
  ControlWidth,
  ControlType,
  VariableName,
  ControlLabel,
} from './shared_form_components';
import {
  getRecurrentVariableName,
  getValuesFromQueryField,
  getFlyoutStyling,
  appendStatsByToQuery,
} from './helpers';
import { EsqlControlFlyoutType } from '../types';
import { ChooseColumnPopover } from './choose_column_popover';

interface ValueControlFormProps {
  search: ISearchGeneric;
  controlType: EsqlControlType;
  queryString: string;
  closeFlyout: () => void;
  onCreateControl: (state: ESQLControlState, variableName: string, variableValue: string) => void;
  onEditControl: (state: ESQLControlState, variableName: string, variableValue: string) => void;
  onCancelControlCb?: () => void;
  initialState?: ESQLControlState;
}

export function ValueControlForm({
  controlType,
  initialState,
  onCancelControlCb,
  queryString,
  search,
  closeFlyout,
  onCreateControl,
  onEditControl,
}: ValueControlFormProps) {
  const valuesField = useMemo(() => getValuesFromQueryField(queryString), [queryString]);
  const suggestedVariableName = useMemo(() => {
    const existingVariables = esqlVariablesService.getVariablesByType(controlType);

    if (initialState) {
      return initialState.variableName;
    }

    if (valuesField) {
      // variables names can't have special characters, only underscore
      const fieldVariableName = valuesField.replace(/[^a-zA-Z0-9]/g, '_');
      return getRecurrentVariableName(
        fieldVariableName,
        existingVariables.map((variable) => variable.key)
      );
    }
    return getRecurrentVariableName(
      'variable',
      existingVariables.map((variable) => variable.key)
    );
  }, [controlType, initialState, valuesField]);

  const [controlFlyoutType, setControlFlyoutType] = useState<EsqlControlFlyoutType>(
    EsqlControlFlyoutType.VALUES_FROM_QUERY
  );

  const [availableValuesOptions, setAvailableValuesOptions] = useState<EuiComboBoxOptionOption[]>(
    []
  );

  const [selectedValues, setSelectedValues] = useState<EuiComboBoxOptionOption[]>(
    initialState
      ? initialState.availableOptions.map((option) => {
          return {
            label: option,
            'data-test-subj': option,
            key: option,
          };
        })
      : []
  );

  const [valuesQuery, setValuesQuery] = useState<string>(initialState?.esqlQuery ?? '');
  const [esqlQueryErrors, setEsqlQueryErrors] = useState<Error[] | undefined>();
  const [formIsInvalid, setFormIsInvalid] = useState(false);
  const [queryColumns, setQueryColumns] = useState<string[]>([valuesField ?? '']);
  const [variableName, setVariableName] = useState(suggestedVariableName);
  const [label, setLabel] = useState(initialState?.title ?? '');
  const [minimumWidth, setMinimumWidth] = useState(initialState?.width ?? 'medium');
  const [grow, setGrow] = useState(initialState?.grow ?? false);

  const isControlInEditMode = useMemo(() => !!initialState, [initialState]);

  useEffect(() => {
    const variableExists =
      esqlVariablesService.variableExists(variableName.replace('?', '')) && !isControlInEditMode;
    setFormIsInvalid(!valuesQuery || !variableName || variableExists);
  }, [isControlInEditMode, valuesQuery, variableName]);

  const onValuesChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    setSelectedValues(selectedOptions);
  }, []);

  const onVariableNameChange = useCallback(
    (e: { target: { value: React.SetStateAction<string> } }) => {
      setVariableName(e.target.value);
    },
    []
  );

  const onLabelChange = useCallback((e: { target: { value: React.SetStateAction<string> } }) => {
    setLabel(e.target.value);
  }, []);

  const onMinimumSizeChange = useCallback((optionId: string) => {
    setMinimumWidth(optionId);
  }, []);

  const onGrowChange = useCallback((e: EuiSwitchEvent) => {
    setGrow(e.target.checked);
  }, []);

  const onValuesQuerySubmit = useCallback(
    async (query: string) => {
      try {
        getESQLResults({
          esqlQuery: query,
          search,
          signal: undefined,
          filter: undefined,
          dropNullColumns: true,
        }).then((results) => {
          const columns = results.response.columns.map((col) => col.name);
          setQueryColumns(columns);

          if (columns.length === 1) {
            const valuesArray = results.response.values.map((value) => value[0]);
            const options = valuesArray
              .filter((v) => v)
              .map((option) => {
                return {
                  label: String(option),
                  key: String(option),
                };
              });
            setSelectedValues(options);
            setAvailableValuesOptions(options);
            setEsqlQueryErrors([]);
          }
        });
        setValuesQuery(query);
      } catch (e) {
        setEsqlQueryErrors([e]);
      }
    },
    [search]
  );

  useEffect(() => {
    if (!selectedValues?.length && controlFlyoutType === EsqlControlFlyoutType.VALUES_FROM_QUERY) {
      const column = getValuesFromQueryField(queryString);
      const queryForValues =
        suggestedVariableName !== ''
          ? `FROM ${getIndexPatternFromESQLQuery(queryString)} | STATS BY ${column}`
          : '';
      onValuesQuerySubmit(queryForValues);
    }
  }, [
    controlFlyoutType,
    controlType,
    onValuesQuerySubmit,
    queryString,
    selectedValues?.length,
    suggestedVariableName,
    variableName,
  ]);

  const onCreateValueControl = useCallback(async () => {
    const availableOptions = selectedValues.map((value) => value.label);
    const state = {
      availableOptions,
      selectedOptions: [availableOptions[0]],
      width: minimumWidth,
      title: label || variableName,
      variableName,
      variableType: controlType,
      esqlQuery: valuesQuery || queryString,
      grow,
    };

    if (availableOptions.length) {
      if (!isControlInEditMode) {
        await onCreateControl(state, variableName, availableOptions[0]);
      } else {
        onEditControl(state, variableName, availableOptions[0]);
      }
    }
    closeFlyout();
  }, [
    selectedValues,
    minimumWidth,
    label,
    variableName,
    controlType,
    valuesQuery,
    queryString,
    grow,
    closeFlyout,
    isControlInEditMode,
    onCreateControl,
    onEditControl,
  ]);

  const updateQuery = useCallback(
    (column: string) => {
      const updatedQuery = appendStatsByToQuery(valuesQuery, column);
      onValuesQuerySubmit(updatedQuery);
    },
    [onValuesQuerySubmit, valuesQuery]
  );

  const styling = useMemo(() => getFlyoutStyling(), []);

  return (
    <>
      <Header />
      <EuiFlyoutBody
        css={css`
          ${styling}
        `}
      >
        <ControlType
          isDisabled={false}
          initialControlFlyoutType={controlFlyoutType}
          setControlFlyoutType={setControlFlyoutType}
        />

        <VariableName
          variableName={variableName}
          isControlInEditMode={isControlInEditMode}
          onVariableNameChange={onVariableNameChange}
        />

        {controlFlyoutType === EsqlControlFlyoutType.VALUES_FROM_QUERY && (
          <>
            <EuiFormRow
              label={i18n.translate('esql.flyout.valuesQueryEditor.label', {
                defaultMessage: 'Values query',
              })}
              fullWidth
            >
              <ESQLEditor
                query={{ esql: valuesQuery }}
                onTextLangQueryChange={(q) => {
                  setValuesQuery(q.esql);
                }}
                hideTimeFilterInfo={true}
                disableAutoFocus={true}
                errors={esqlQueryErrors}
                editorIsInline
                hideRunQueryText
                onTextLangQuerySubmit={async (q, a) => {
                  if (q) {
                    await onValuesQuerySubmit(q.esql);
                  }
                }}
                isDisabled={false}
                isLoading={false}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate('esql.flyout.previewValues.placeholder', {
                defaultMessage: 'Values preview',
              })}
              fullWidth
            >
              <EuiPanel
                paddingSize="s"
                hasBorder
                css={css`
                  white-space: wrap;
                  overflow-y: auto;
                  max-height: 200px;
                `}
              >
                {queryColumns.length === 1 ? (
                  selectedValues.map((value) => value.label).join(', ')
                ) : (
                  <EuiCallOut
                    title={i18n.translate('esql.flyout.displayMultipleColsCallout.title', {
                      defaultMessage: 'Your query must return a single column',
                    })}
                    iconType="warning"
                  >
                    <p>
                      <FormattedMessage
                        id="esql.flyout.displayMultipleColsCallout.description"
                        defaultMessage="Your query is currently returning {totalColumns} columns. Choose column {chooseColumnPopover} or use {boldText}."
                        values={{
                          totalColumns: queryColumns.length,
                          boldText: <strong>STATS BY</strong>,
                          chooseColumnPopover: (
                            <ChooseColumnPopover columns={queryColumns} updateQuery={updateQuery} />
                          ),
                        }}
                      />
                    </p>
                  </EuiCallOut>
                )}
              </EuiPanel>
            </EuiFormRow>
          </>
        )}
        {controlFlyoutType === EsqlControlFlyoutType.STATIC_VALUES && (
          <EuiFormRow
            label={i18n.translate('esql.flyout.values.label', {
              defaultMessage: 'Values',
            })}
            fullWidth
          >
            <EuiComboBox
              aria-label={i18n.translate('esql.flyout.values.placeholder', {
                defaultMessage: 'Select the options',
              })}
              placeholder={i18n.translate('esql.flyout.values.placeholder', {
                defaultMessage: 'Select the options',
              })}
              options={availableValuesOptions}
              selectedOptions={selectedValues}
              onChange={onValuesChange}
              fullWidth
              compressed
              css={css`
                max-height: 200px;
                overflow-y: auto;
              `}
            />
          </EuiFormRow>
        )}
        <ControlLabel label={label} onLabelChange={onLabelChange} />

        <ControlWidth
          minimumWidth={minimumWidth}
          grow={grow}
          onMinimumSizeChange={onMinimumSizeChange}
          onGrowChange={onGrowChange}
        />
      </EuiFlyoutBody>
      <Footer
        isControlInEditMode={isControlInEditMode}
        variableName={variableName}
        onCancelControlCb={onCancelControlCb}
        isSaveDisabled={formIsInvalid}
        closeFlyout={closeFlyout}
        onCreateControl={onCreateValueControl}
      />
    </>
  );
}

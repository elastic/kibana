/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
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
import { ESQLVariableType, ESQLControlVariable } from '@kbn/esql-validation-autocomplete';
import {
  getIndexPatternFromESQLQuery,
  getESQLResults,
  appendStatsByToQuery,
  getValuesFromQueryField,
} from '@kbn/esql-utils';
import { ESQLLangEditor } from '../../../create_editor';
import type { ESQLControlState, ControlWidthOptions } from '../types';
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
  getFlyoutStyling,
  areValuesIntervalsValid,
  validateVariableName,
  getVariablePrefix,
} from './helpers';
import { EsqlControlType } from '../types';
import { ChooseColumnPopover } from './choose_column_popover';

interface ValueControlFormProps {
  search: ISearchGeneric;
  variableType: ESQLVariableType;
  queryString: string;
  esqlVariables: ESQLControlVariable[];
  closeFlyout: () => void;
  onCreateControl: (state: ESQLControlState, variableName: string) => void;
  onEditControl: (state: ESQLControlState) => void;
  onCancelControl?: () => void;
  initialState?: ESQLControlState;
}

const SUGGESTED_INTERVAL_VALUES = ['5 minutes', '1 hour', '1 day', '1 week', '1 month'];

export function ValueControlForm({
  variableType,
  initialState,
  onCancelControl,
  queryString,
  esqlVariables,
  search,
  closeFlyout,
  onCreateControl,
  onEditControl,
}: ValueControlFormProps) {
  const isMounted = useMountedState();
  const valuesField = useMemo(() => {
    if (variableType === ESQLVariableType.VALUES) {
      return getValuesFromQueryField(queryString);
    }
    return null;
  }, [variableType, queryString]);
  const suggestedVariableName = useMemo(() => {
    const existingVariables = new Set(
      esqlVariables
        .filter((variable) => variable.type === variableType)
        .map((variable) => variable.key)
    );

    if (initialState) {
      return initialState.variableName;
    }

    let variablePrefix = getVariablePrefix(variableType);

    if (valuesField && variableType === ESQLVariableType.VALUES) {
      // variables names can't have special characters, only underscore
      const fieldVariableName = valuesField.replace(/[^a-zA-Z0-9]/g, '_');
      variablePrefix = fieldVariableName;
    }

    return getRecurrentVariableName(variablePrefix, existingVariables);
  }, [esqlVariables, initialState, valuesField, variableType]);

  const [controlFlyoutType, setControlFlyoutType] = useState<EsqlControlType>(
    initialState?.controlType ??
      (variableType === ESQLVariableType.TIME_LITERAL
        ? EsqlControlType.STATIC_VALUES
        : EsqlControlType.VALUES_FROM_QUERY)
  );

  const [availableValuesOptions, setAvailableValuesOptions] = useState<EuiComboBoxOptionOption[]>(
    variableType === ESQLVariableType.TIME_LITERAL
      ? SUGGESTED_INTERVAL_VALUES.map((option) => {
          return {
            label: option,
            key: option,
            'data-test-subj': option,
          };
        })
      : []
  );

  const [selectedValues, setSelectedValues] = useState<EuiComboBoxOptionOption[]>(
    initialState
      ? initialState.availableOptions.map((option) => {
          return {
            label: option,
            key: option,
            'data-test-subj': option,
          };
        })
      : []
  );

  const [valuesQuery, setValuesQuery] = useState<string>(
    variableType === ESQLVariableType.VALUES ? initialState?.esqlQuery ?? '' : ''
  );
  const [esqlQueryErrors, setEsqlQueryErrors] = useState<Error[] | undefined>();
  const [formIsInvalid, setFormIsInvalid] = useState(false);
  const [queryColumns, setQueryColumns] = useState<string[]>(valuesField ? [valuesField] : []);
  const [variableName, setVariableName] = useState(suggestedVariableName);
  const [label, setLabel] = useState(initialState?.title ?? '');
  const [minimumWidth, setMinimumWidth] = useState(initialState?.width ?? 'medium');
  const [grow, setGrow] = useState(initialState?.grow ?? false);

  const isControlInEditMode = useMemo(() => !!initialState, [initialState]);

  const areValuesValid = useMemo(() => {
    return variableType === ESQLVariableType.TIME_LITERAL
      ? areValuesIntervalsValid(selectedValues.map((option) => option.label))
      : true;
  }, [variableType, selectedValues]);

  useEffect(() => {
    const variableExists =
      esqlVariables.some((variable) => variable.key === variableName.replace('?', '')) &&
      !isControlInEditMode;
    setFormIsInvalid(!variableName || variableExists || !areValuesValid || !selectedValues.length);
  }, [
    areValuesValid,
    esqlVariables,
    isControlInEditMode,
    selectedValues.length,
    valuesQuery,
    variableName,
  ]);

  const onValuesChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    setSelectedValues(selectedOptions);
  }, []);

  const onFlyoutTypeChange = useCallback(
    (type: EsqlControlType) => {
      setControlFlyoutType(type);
      if (type !== controlFlyoutType && variableType === ESQLVariableType.TIME_LITERAL) {
        setSelectedValues([]);
      }
    },
    [controlFlyoutType, variableType]
  );

  const onCreateOption = useCallback(
    (searchValue: string, flattenedOptions: EuiComboBoxOptionOption[] = []) => {
      if (!searchValue) {
        return;
      }

      const normalizedSearchValue = searchValue.trim().toLowerCase();

      const newOption = {
        'data-test-subj': searchValue,
        label: searchValue,
        key: searchValue,
      };

      if (
        flattenedOptions.findIndex(
          (option) => option.label.trim().toLowerCase() === normalizedSearchValue
        ) === -1
      ) {
        setAvailableValuesOptions([...availableValuesOptions, newOption]);
      }

      setSelectedValues((prevSelected) => [...prevSelected, newOption]);
    },
    [availableValuesOptions]
  );

  const onVariableNameChange = useCallback(
    (e: { target: { value: React.SetStateAction<string> } }) => {
      const text = validateVariableName(String(e.target.value));
      setVariableName(text);
    },
    []
  );

  const onLabelChange = useCallback((e: { target: { value: React.SetStateAction<string> } }) => {
    setLabel(e.target.value);
  }, []);

  const onMinimumSizeChange = useCallback((optionId: string) => {
    if (optionId) {
      setMinimumWidth(optionId as ControlWidthOptions);
    }
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
          if (!isMounted()) {
            return;
          }
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
                  'data-test-subj': String(option),
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
    [isMounted, search]
  );

  useEffect(() => {
    if (
      !selectedValues?.length &&
      controlFlyoutType === EsqlControlType.VALUES_FROM_QUERY &&
      valuesField
    ) {
      const queryForValues =
        suggestedVariableName !== ''
          ? `FROM ${getIndexPatternFromESQLQuery(queryString)} | STATS BY ${valuesField}`
          : '';
      onValuesQuerySubmit(queryForValues);
    }
  }, [
    controlFlyoutType,
    onValuesQuerySubmit,
    queryString,
    selectedValues?.length,
    suggestedVariableName,
    valuesField,
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
      variableType,
      esqlQuery: valuesQuery || queryString,
      controlType: controlFlyoutType,
      grow,
    };

    if (availableOptions.length) {
      if (!isControlInEditMode) {
        await onCreateControl(state, variableName);
      } else {
        onEditControl(state);
      }
    }
    closeFlyout();
  }, [
    selectedValues,
    controlFlyoutType,
    minimumWidth,
    label,
    variableName,
    variableType,
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
      <Header isInEditMode={isControlInEditMode} />
      <EuiFlyoutBody
        css={css`
          ${styling}
        `}
      >
        <ControlType
          isDisabled={false}
          initialControlFlyoutType={controlFlyoutType}
          onFlyoutTypeChange={onFlyoutTypeChange}
        />

        <VariableName
          variableName={variableName}
          isControlInEditMode={isControlInEditMode}
          onVariableNameChange={onVariableNameChange}
          esqlVariables={esqlVariables}
        />

        {controlFlyoutType === EsqlControlType.VALUES_FROM_QUERY && (
          <>
            <EuiFormRow
              label={i18n.translate('esql.flyout.valuesQueryEditor.label', {
                defaultMessage: 'Values query',
              })}
              fullWidth
            >
              <ESQLLangEditor
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
            {queryColumns.length > 0 && (
              <EuiFormRow
                label={i18n.translate('esql.flyout.previewValues.placeholder', {
                  defaultMessage: 'Values preview',
                })}
                fullWidth
              >
                {queryColumns.length === 1 ? (
                  <EuiPanel
                    paddingSize="s"
                    color="primary"
                    css={css`
                      white-space: wrap;
                      overflow-y: auto;
                      max-height: 200px;
                    `}
                    data-test-subj="esqlValuesPreview"
                  >
                    {selectedValues.map((value) => value.label).join(', ')}
                  </EuiPanel>
                ) : (
                  <EuiCallOut
                    title={i18n.translate('esql.flyout.displayMultipleColsCallout.title', {
                      defaultMessage: 'Your query must return a single column',
                    })}
                    color="warning"
                    iconType="warning"
                    size="s"
                    data-test-subj="esqlMoreThanOneColumnCallout"
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
              </EuiFormRow>
            )}
          </>
        )}
        {controlFlyoutType === EsqlControlType.STATIC_VALUES && (
          <EuiFormRow
            label={i18n.translate('esql.flyout.values.label', {
              defaultMessage: 'Values',
            })}
            fullWidth
          >
            <EuiComboBox
              aria-label={i18n.translate('esql.flyout.values.placeholder', {
                defaultMessage: 'Select or add values',
              })}
              placeholder={i18n.translate('esql.flyout.values.placeholder', {
                defaultMessage: 'Select or add values',
              })}
              data-test-subj="esqlValuesOptions"
              options={availableValuesOptions}
              selectedOptions={selectedValues}
              onChange={onValuesChange}
              onCreateOption={onCreateOption}
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
        onCancelControl={onCancelControl}
        isSaveDisabled={formIsInvalid}
        closeFlyout={closeFlyout}
        onCreateControl={onCreateValueControl}
      />
    </>
  );
}

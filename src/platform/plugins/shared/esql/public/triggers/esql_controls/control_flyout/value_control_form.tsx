/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useEffect } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiCallOut,
  type EuiSwitchEvent,
  EuiPanel,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ISearchGeneric } from '@kbn/search-types';
import { ESQLVariableType } from '@kbn/esql-types';
import {
  getIndexPatternFromESQLQuery,
  getESQLResults,
  appendStatsByToQuery,
} from '@kbn/esql-utils';
import { ESQLLangEditor } from '../../../create_editor';
import type { ESQLControlState, ControlWidthOptions } from '../types';
import { ControlWidth, ControlLabel } from './shared_form_components';
import { EsqlControlType } from '../types';
import { ChooseColumnPopover } from './choose_column_popover';

interface ValueControlFormProps {
  search: ISearchGeneric;
  variableType: ESQLVariableType;
  variableName: string;
  controlFlyoutType: EsqlControlType;
  queryString: string;
  setControlState: (state: ESQLControlState) => void;
  initialState?: ESQLControlState;
  valuesRetrieval?: string;
}

const SUGGESTED_INTERVAL_VALUES = ['5 minutes', '1 hour', '1 day', '1 week', '1 month'];

export function ValueControlForm({
  variableType,
  initialState,
  queryString,
  variableName,
  controlFlyoutType,
  search,
  setControlState,
  valuesRetrieval,
}: ValueControlFormProps) {
  const isMounted = useMountedState();

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
  const [queryColumns, setQueryColumns] = useState<string[]>(
    valuesRetrieval ? [valuesRetrieval] : []
  );
  const [label, setLabel] = useState(initialState?.title ?? '');
  const [minimumWidth, setMinimumWidth] = useState(initialState?.width ?? 'medium');
  const [grow, setGrow] = useState(initialState?.grow ?? false);

  const onValuesChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    setSelectedValues(selectedOptions);
  }, []);

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
      valuesRetrieval
    ) {
      const queryForValues =
        variableName !== ''
          ? `FROM ${getIndexPatternFromESQLQuery(queryString)} | STATS BY ${valuesRetrieval}`
          : '';
      onValuesQuerySubmit(queryForValues);
    }
  }, [
    controlFlyoutType,
    onValuesQuerySubmit,
    queryString,
    selectedValues?.length,
    valuesRetrieval,
    variableName,
  ]);

  useEffect(() => {
    const availableOptions = selectedValues.map((value) => value.label);
    // removes the question mark from the variable name
    const variableNameWithoutQuestionmark = variableName.replace(/^\?+/, '');
    const state = {
      availableOptions,
      selectedOptions: [availableOptions[0]],
      width: minimumWidth,
      title: label || variableNameWithoutQuestionmark,
      variableName: variableNameWithoutQuestionmark,
      variableType,
      esqlQuery: valuesQuery || queryString,
      controlType: controlFlyoutType,
      grow,
    };
    if (!isEqual(state, initialState)) {
      setControlState(state);
    }
  }, [
    controlFlyoutType,
    grow,
    initialState,
    label,
    minimumWidth,
    queryString,
    selectedValues,
    setControlState,
    valuesQuery,
    variableName,
    variableType,
  ]);

  const updateQuery = useCallback(
    (column: string) => {
      const updatedQuery = appendStatsByToQuery(valuesQuery, column);
      onValuesQuerySubmit(updatedQuery);
    },
    [onValuesQuerySubmit, valuesQuery]
  );

  return (
    <>
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
    </>
  );
}

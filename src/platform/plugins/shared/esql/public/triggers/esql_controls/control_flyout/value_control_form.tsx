/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiCallOut,
  EuiComboBox,
  EuiFormLabel,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { TimeRange } from '@kbn/es-query';
import {
  ESQLVariableType,
  EsqlControlType,
  TIMEFIELD_ROUTE,
  type ESQLControlState,
  type ESQLControlVariable,
} from '@kbn/esql-types';
import {
  appendStatsByToQuery,
  getESQLResults,
  getIndexPatternFromESQLQuery,
} from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ISearchGeneric } from '@kbn/search-types';
import { isEqual } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { ESQLLangEditor } from '../../../create_editor';
import type { ServiceDeps } from '../../../kibana_services';
import { ChooseColumnPopover } from './choose_column_popover';
import { ControlLabel, ControlSelectionType } from './shared_form_components';

interface ValueControlFormProps {
  search: ISearchGeneric;
  variableType: ESQLVariableType;
  variableName: string;
  controlFlyoutType: EsqlControlType;
  queryString: string;
  setControlState: (state: ESQLControlState) => void;
  initialState?: ESQLControlState;
  valuesRetrieval?: string;
  timeRange?: TimeRange;
  esqlVariables: ESQLControlVariable[];
}

const SUGGESTED_INTERVAL_VALUES = ['5 minutes', '1 hour', '1 day', '1 week', '1 month'];
const INITIAL_EMPTY_STATE_QUERY = `/** Example
To get the agent field values use: 
FROM logs-* 
|  WHERE @timestamp <=?_tend and @timestamp >?_tstart
| STATS BY agent
*/`;

export function ValueControlForm({
  variableType,
  initialState,
  queryString,
  variableName,
  controlFlyoutType,
  search,
  setControlState,
  valuesRetrieval,
  timeRange,
  esqlVariables,
}: ValueControlFormProps) {
  const isMounted = useMountedState();
  const theme = useEuiTheme();
  const kibana = useKibana<ServiceDeps>();
  const { core } = kibana.services;

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
    initialState?.availableOptions
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
    variableType === ESQLVariableType.VALUES
      ? initialState?.esqlQuery ?? INITIAL_EMPTY_STATE_QUERY
      : ''
  );
  const [esqlQueryErrors, setEsqlQueryErrors] = useState<Error[] | undefined>();
  const [queryColumns, setQueryColumns] = useState<string[]>(
    valuesRetrieval ? [valuesRetrieval] : []
  );
  const [showValuesPreview, setShowValuesPreview] = useState<boolean>(false);
  const [label, setLabel] = useState(initialState?.title ?? '');

  const shouldDefaultToMultiSelect = variableType === ESQLVariableType.MULTI_VALUES;
  const [singleSelect, setSingleSelect] = useState<boolean>(
    initialState?.singleSelect ?? !shouldDefaultToMultiSelect
  );

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

  const onSelectionTypeChange = useCallback((isSingleSelect: boolean) => {
    setSingleSelect(isSingleSelect);
  }, []);

  const onValuesQuerySubmit = useCallback(
    async (query: string) => {
      try {
        const timezone = core.uiSettings.get<'Browser' | string>(UI_SETTINGS.DATEFORMAT_TZ);
        getESQLResults({
          esqlQuery: query,
          search,
          signal: undefined,
          filter: undefined,
          dropNullColumns: true,
          timeRange,
          timezone,
          variables: esqlVariables,
        }).then((results) => {
          if (!isMounted()) {
            return;
          }
          const columns = results.response.columns.map((col) => col.name);
          setQueryColumns(columns);
          setShowValuesPreview(true);

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
    [isMounted, search, timeRange, esqlVariables, core.uiSettings]
  );

  const setSuggestedQuery = useCallback(async () => {
    const indexPattern = getIndexPatternFromESQLQuery(queryString);
    const encodedQuery = encodeURIComponent(`FROM ${indexPattern}`);
    const response = (await core.http?.get(`${TIMEFIELD_ROUTE}${encodedQuery}`).catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch the timefield', error);
      return undefined;
    })) as { timeField?: string } | undefined;

    const timeField = response?.timeField;
    const timeFilter = Boolean(timeField)
      ? ` | WHERE ${timeField} <= ?_tend and ${timeField} > ?_tstart`
      : '';
    const queryForValues = `FROM ${indexPattern}${timeFilter} | STATS BY ${valuesRetrieval}`;
    onValuesQuerySubmit(queryForValues);
  }, [queryString, core.http, valuesRetrieval, onValuesQuerySubmit]);

  useEffect(() => {
    if (!selectedValues?.length && controlFlyoutType === EsqlControlType.VALUES_FROM_QUERY) {
      if (initialState?.esqlQuery) {
        onValuesQuerySubmit(initialState.esqlQuery);
      } else if (valuesRetrieval) {
        setSuggestedQuery();
      }
    }
  }, [
    selectedValues?.length,
    controlFlyoutType,
    initialState?.esqlQuery,
    variableName,
    valuesRetrieval,
    onValuesQuerySubmit,
    setSuggestedQuery,
  ]);

  useEffect(() => {
    const availableOptions = selectedValues.map((value) => value.label);
    // removes the question mark from the variable name
    const variableNameWithoutQuestionmark = variableName.replace(/^\?+/, '');
    const state = {
      availableOptions,
      selectedOptions: [availableOptions[0]],
      singleSelect,
      title: label || variableNameWithoutQuestionmark,
      variableName: variableNameWithoutQuestionmark,
      variableType: singleSelect ? variableType : ESQLVariableType.MULTI_VALUES,
      esqlQuery: valuesQuery || queryString,
      controlType: controlFlyoutType,
    };
    if (!isEqual(state, initialState)) {
      setControlState(state);
    }
  }, [
    singleSelect,
    controlFlyoutType,
    initialState,
    label,
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
          <EuiFormLabel
            css={css`
              display: block;
              width: 100%;
              margin-block-start: ${theme.euiTheme.size.s};
              padding-block-start: ${theme.euiTheme.size.s};
              padding-block-end: ${theme.euiTheme.size.s};
              border-bottom: ${theme.euiTheme.border.thin};
            `}
          >
            {i18n.translate('esql.flyout.valuesQueryEditor.label', {
              defaultMessage: 'Values query',
            })}
          </EuiFormLabel>
          <EuiSpacer size="xs" />
          <ESQLLangEditor
            query={{ esql: valuesQuery }}
            onTextLangQueryChange={(q) => {
              setValuesQuery(q.esql);
            }}
            disableAutoFocus={true}
            errors={esqlQueryErrors}
            editorIsInline
            onTextLangQuerySubmit={async (q, a) => {
              if (q) {
                await onValuesQuerySubmit(q.esql);
              }
            }}
            isDisabled={false}
            isLoading={false}
            esqlVariables={esqlVariables}
          />
          {showValuesPreview && (
            <EuiFormRow
              label={i18n.translate('esql.flyout.previewValues.placeholder', {
                defaultMessage: 'Values preview',
              })}
              fullWidth
              css={css`
                margin-block-start: ${theme.euiTheme.size.base};
              `}
            >
              <>
                {queryColumns.length === 0 && (
                  <EuiCallOut
                    announceOnMount
                    title={i18n.translate('esql.flyout.displayNoValuesForControlCallout.title', {
                      defaultMessage:
                        "This query isn't returning any values. Edit it and run it again.",
                    })}
                    color="warning"
                    iconType="warning"
                    size="s"
                    data-test-subj="esqlNoValuesForControlCallout"
                  />
                )}
                {queryColumns.length === 1 && (
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
                )}
                {queryColumns.length > 1 && (
                  <EuiCallOut
                    announceOnMount
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
              </>
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
            isClearable
            fullWidth
            compressed
            css={css`
              max-height: 200px;
              overflow-y: auto;
              .euiFormControlLayoutIcons {
                align-items: flex-start;
                padding-block-start: 1ch;
              }
            `}
          />
        </EuiFormRow>
      )}
      <ControlLabel label={label} onLabelChange={onLabelChange} />

      <ControlSelectionType
        singleSelect={singleSelect}
        onSelectionTypeChange={onSelectionTypeChange}
      />
    </>
  );
}

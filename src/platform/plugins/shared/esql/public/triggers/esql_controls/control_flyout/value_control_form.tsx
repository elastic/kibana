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
  EuiFieldText,
  EuiFormRow,
  EuiFlyoutBody,
  type EuiSwitchEvent,
  EuiTextArea,
} from '@elastic/eui';
import { css } from '@emotion/react';
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
import { getRecurrentVariableName, getValuesFromQueryField } from './helpers';
import { EsqlControlFlyoutType } from '../types';

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
  const suggestedStaticValues = useMemo(
    () => (initialState ? initialState.availableOptions : []),
    [initialState]
  );

  const suggestedVariableName = useMemo(() => {
    const existingVariables = esqlVariablesService.getVariablesByType(controlType);

    if (initialState) {
      return initialState.variableName;
    }

    const field = getValuesFromQueryField(queryString);
    if (field) {
      // variables names can't have special characters, only underscore
      const fieldVariableName = field.replace(/[^a-zA-Z0-9]/g, '_');
      return getRecurrentVariableName(
        fieldVariableName,
        existingVariables.map((variable) => variable.key)
      );
    }
    return getRecurrentVariableName(
      'variable',
      existingVariables.map((variable) => variable.key)
    );
  }, [controlType, initialState, queryString]);

  const [controlFlyoutType, setControlFlyoutType] = useState<EsqlControlFlyoutType>(
    EsqlControlFlyoutType.VALUES_FROM_QUERY
  );
  const [values, setValues] = useState<string | undefined>(suggestedStaticValues.join(','));
  const [valuesQuery, setValuesQuery] = useState<string>(initialState?.esqlQuery ?? '');
  const [esqlQueryErrors, setEsqlQueryErrors] = useState<Error[] | undefined>();
  const [formIsInvalid, setFormIsInvalid] = useState(false);
  const [variableName, setVariableName] = useState(suggestedVariableName);
  const [label, setLabel] = useState(initialState?.title ?? '');
  const [minimumWidth, setMinimumWidth] = useState(initialState?.width ?? 'medium');
  const [grow, setGrow] = useState(initialState?.grow ?? false);

  const isControlInEditMode = useMemo(() => !!initialState, [initialState]);

  useEffect(() => {
    const variableExists =
      esqlVariablesService.variableExists(variableName.replace('?', '')) && !isControlInEditMode;
    setFormIsInvalid(!valuesQuery || !variableName || variableExists);
  }, [isControlInEditMode, values, valuesQuery, variableName]);

  const onValuesChange = useCallback(
    (e: { target: { value: React.SetStateAction<string | undefined> } }) => {
      setValues(e.target.value);
    },
    []
  );

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
      if (valuesQuery !== query) {
        try {
          getESQLResults({
            esqlQuery: query,
            search,
            signal: undefined,
            filter: undefined,
            dropNullColumns: true,
          }).then((results) => {
            const valuesArray = results.response.values.map((value) => value[0]);
            setValues(valuesArray.filter((v) => v).join(', '));
            setEsqlQueryErrors([]);
          });
          setValuesQuery(query);
        } catch (e) {
          setEsqlQueryErrors([e]);
        }
      }
    },
    [search, valuesQuery]
  );

  useEffect(() => {
    if (!values?.length) {
      const column = getValuesFromQueryField(queryString);
      const queryForValues =
        suggestedVariableName !== ''
          ? `FROM ${getIndexPatternFromESQLQuery(queryString)} | STATS BY ${column}`
          : '';
      onValuesQuerySubmit(queryForValues);
    }
  }, [
    controlType,
    onValuesQuerySubmit,
    queryString,
    suggestedVariableName,
    values?.length,
    variableName,
  ]);

  const onCreateValueControl = useCallback(async () => {
    const availableOptions = values?.split(',').map((value) => value.trim()) ?? [];
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
    values,
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

  return (
    <>
      <Header />
      <EuiFlyoutBody
        css={css`
          // styles needed to display extra drop targets that are outside of the config panel main area
          overflow-y: auto;
          pointer-events: none;
          .euiFlyoutBody__overflow {
            -webkit-mask-image: none;
            padding-left: inherit;
            margin-left: inherit;
            overflow-y: hidden;
            transform: initial;
            > * {
              pointer-events: auto;
            }
          }
          .euiFlyoutBody__overflowContent {
            block-size: 100%;
          }
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
              isInvalid={!valuesQuery}
              error={
                !valuesQuery
                  ? i18n.translate('esql.flyout.valuesQueryEditor.error', {
                      defaultMessage: 'Query is required',
                    })
                  : undefined
              }
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
              <EuiTextArea
                placeholder={i18n.translate('esql.flyout.values.placeholder', {
                  defaultMessage: 'Set the static values',
                })}
                value={values}
                disabled
                compressed
                onChange={() => {}}
                aria-label={i18n.translate('esql.flyout.previewValues.placeholder', {
                  defaultMessage: 'Values preview',
                })}
                fullWidth
              />
            </EuiFormRow>
          </>
        )}
        {controlFlyoutType === EsqlControlFlyoutType.STATIC_VALUES && (
          <EuiFormRow
            label={i18n.translate('esql.flyout.values.label', {
              defaultMessage: 'Values',
            })}
            helpText={i18n.translate('esql.flyout.values.helpText', {
              defaultMessage:
                'Comma separated values (e.g. 5 minutes, 1 hour, 1 day, 1 week, 1 year)',
            })}
            fullWidth
            isInvalid={!values}
            error={
              !values
                ? i18n.translate('esql.flyout.values.error', {
                    defaultMessage: 'Values are required',
                  })
                : undefined
            }
          >
            <EuiFieldText
              placeholder={i18n.translate('esql.flyout.values.placeholder', {
                defaultMessage: 'Set the static values',
              })}
              value={values}
              onChange={onValuesChange}
              aria-label={i18n.translate('esql.flyout.values.placeholder', {
                defaultMessage: 'Set the static values',
              })}
              fullWidth
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

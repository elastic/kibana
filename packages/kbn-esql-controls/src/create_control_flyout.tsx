/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiButton,
  EuiTitle,
  EuiFlyoutFooter,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFormRow,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { ISearchGeneric } from '@kbn/search-types';
import { getESQLQueryColumnsRaw, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { monaco } from '@kbn/monaco';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { EsqlControlType, EsqlControlFlyoutType } from './types';

interface ESQLControlsFlyoutProps {
  search: ISearchGeneric;
  controlType: EsqlControlType;
  queryString: string;
  dashboardApi: DashboardApi;
  panelId?: string;
  cursorPosition?: monaco.Position;
  closeFlyout: () => void;
  addToESQLVariablesService: (
    variable: string,
    variableValue: string,
    controlType: string,
    query: string
  ) => void;
  openEditFlyout: (embeddable: unknown) => Promise<void>;
}

const getControlFlyoutType = (controlType: EsqlControlType) => {
  switch (controlType) {
    case EsqlControlType.TIME_LITERAL:
    case EsqlControlType.FIELDS:
      return EsqlControlFlyoutType.STATIC_VALUES;
    default:
      return EsqlControlFlyoutType.STATIC_VALUES;
  }
};

const getVariableName = (controlType: EsqlControlType) => {
  switch (controlType) {
    case EsqlControlType.TIME_LITERAL:
      return '?interval';
    case EsqlControlType.FIELDS:
      return '?field';
    default:
      return '?variable';
  }
};

const getSuggestedValues = (controlType: EsqlControlType) => {
  switch (controlType) {
    case EsqlControlType.TIME_LITERAL:
      return '5 minutes, 1 hour, 1 day, 1 week, 1 year';
    default:
      return undefined;
  }
};

const controlTypeOptions = [
  {
    label: i18n.translate('esqlControls.flyout.controlTypeOptions.staticValuesLabel', {
      defaultMessage: 'Static Values',
    }),
    'data-test-subj': 'staticValues',
    key: EsqlControlFlyoutType.STATIC_VALUES,
  },
  {
    label: i18n.translate('esqlControls.flyout.controlTypeOptions.valuesFromQueryLabel', {
      defaultMessage: 'Values from a query',
    }),
    'data-test-subj': 'valuesFromQuery',
    key: EsqlControlFlyoutType.VALUES_FROM_QUERY,
  },
];

const minimumWidthButtonGroup = [
  {
    id: `small`,
    label: i18n.translate('esqlControls.flyout.minimumWidth.small', {
      defaultMessage: 'Small',
    }),
  },
  {
    id: `medium`,
    label: i18n.translate('esqlControls.flyout.minimumWidth.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    id: `large`,
    label: i18n.translate('esqlControls.flyout.minimumWidth.large', {
      defaultMessage: 'Large',
    }),
  },
];

export function ESQLControlsFlyout({
  search,
  controlType,
  queryString,
  dashboardApi,
  panelId,
  cursorPosition,
  addToESQLVariablesService,
  closeFlyout,
  openEditFlyout,
}: ESQLControlsFlyoutProps) {
  const flyoutType = getControlFlyoutType(controlType);
  const [controlFlyoutType, setControlFlyoutType] = useState<EuiComboBoxOptionOption[]>([
    controlTypeOptions.find((option) => option.key === flyoutType)!,
  ]);
  const controlGroupApi = useStateFromPublishingSubject(dashboardApi.controlGroupApi$);
  const children = useStateFromPublishingSubject(dashboardApi.children$);
  const embeddable = children[panelId!];
  const suggestedVariableName = getVariableName(controlType);
  const [variableName, setVariableName] = useState(suggestedVariableName);

  const suggestedStaticValues = getSuggestedValues(controlType);
  const [values, setValues] = useState<string | undefined>(suggestedStaticValues);

  const [label, setLabel] = useState('');
  const [minimumWidth, setMinimumWidth] = useState('medium');
  const [availableFieldsOptions, setAvailableFieldsOptions] = useState<EuiComboBoxOptionOption[]>(
    []
  );
  const [selectedFields, setSelectedFields] = useState<EuiComboBoxOptionOption[]>([]);

  const onFlyoutTypeChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    setControlFlyoutType(selectedOptions);
  }, []);

  const onFieldsChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    setSelectedFields(selectedOptions);
  }, []);

  const onVariableNameChange = useCallback(
    (e: { target: { value: React.SetStateAction<string> } }) => {
      setVariableName(e.target.value);
    },
    []
  );

  const onValuesChange = useCallback(
    (e: { target: { value: React.SetStateAction<string | undefined> } }) => {
      setValues(e.target.value);
    },
    []
  );

  const onLabelChange = useCallback((e: { target: { value: React.SetStateAction<string> } }) => {
    setLabel(e.target.value);
  }, []);

  const onMinimumSizeChange = useCallback((optionId: string) => {
    setMinimumWidth(optionId);
  }, []);

  const createVariableControl = useCallback(async () => {
    const availableOptions =
      controlType === EsqlControlType.TIME_LITERAL
        ? values?.split(',').map((value) => value.trim()) ?? []
        : selectedFields.map((field) => field.label);
    const varName = variableName.replace('?', '');
    const state = {
      availableOptions,
      selectedOptions: [availableOptions[0]],
      width: minimumWidth,
      title: label || varName,
      variableName: varName,
      variableType: controlType,
      grow: false,
    };
    controlGroupApi?.addNewControl('esqlControlStaticValues', state);

    if (panelId && cursorPosition) {
      const cursorColumn = cursorPosition?.column ?? 0;
      const query = [
        queryString.slice(0, cursorColumn - 1),
        variableName,
        queryString.slice(cursorColumn - 1),
      ].join('');

      addToESQLVariablesService(varName, availableOptions[0], controlType, query);
      await openEditFlyout(embeddable);
    }
    closeFlyout();
  }, [
    closeFlyout,
    controlGroupApi,
    label,
    minimumWidth,
    panelId,
    values,
    variableName,
    embeddable,
    queryString,
    cursorPosition,
    openEditFlyout,
    addToESQLVariablesService,
    controlType,
    selectedFields,
  ]);

  useEffect(() => {
    if (controlType === EsqlControlType.FIELDS && !availableFieldsOptions.length) {
      const indexPattern = getIndexPatternFromESQLQuery(queryString);
      getESQLQueryColumnsRaw({
        esqlQuery: `from ${indexPattern}`,
        search,
      }).then((columns) => {
        setAvailableFieldsOptions(
          columns.map((col) => {
            return {
              label: col.name,
              'data-test-subj': col.name,
              key: col.name,
            };
          })
        );
      });
    }
  }, [availableFieldsOptions.length, controlType, queryString, search]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('esqlControls.flyout.title', {
              defaultMessage: 'Create ES|QL control',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow
          label={i18n.translate('esqlControls.flyout.controlTypeOptions.label', {
            defaultMessage: 'Type',
          })}
        >
          <EuiComboBox
            aria-label={i18n.translate('esqlControls.flyout.controlTypeOptions.placeholder', {
              defaultMessage: 'Select a control type',
            })}
            placeholder={i18n.translate('esqlControls.flyout.controlTypeOptions.placeholder', {
              defaultMessage: 'Select a control type',
            })}
            singleSelection={{ asPlainText: true }}
            options={controlTypeOptions}
            selectedOptions={controlFlyoutType}
            onChange={onFlyoutTypeChange}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('esqlControls.flyout.variableName.label', {
            defaultMessage: 'Name',
          })}
        >
          <EuiFieldText
            placeholder={i18n.translate('esqlControls.flyout.variableName.placeholder', {
              defaultMessage: 'Set a variable name',
            })}
            value={variableName}
            onChange={onVariableNameChange}
            aria-label={i18n.translate('esqlControls.flyout.variableName.placeholder', {
              defaultMessage: 'Set a variable name',
            })}
          />
        </EuiFormRow>
        {controlType === EsqlControlType.FIELDS && (
          <EuiFormRow
            label={i18n.translate('esqlControls.flyout.values.label', {
              defaultMessage: 'Values',
            })}
            helpText={i18n.translate('esqlControls.flyout.values.multipleValuesDropdownLabel', {
              defaultMessage: 'Select multiple values',
            })}
          >
            <EuiComboBox
              aria-label={i18n.translate('esqlControls.flyout.fieldsOptions.placeholder', {
                defaultMessage: 'Select the fields options',
              })}
              placeholder={i18n.translate('esqlControls.flyout.fieldsOptions.placeholder', {
                defaultMessage: 'Select the fields options',
              })}
              options={availableFieldsOptions}
              selectedOptions={selectedFields}
              onChange={onFieldsChange}
            />
          </EuiFormRow>
        )}
        {controlType === EsqlControlType.TIME_LITERAL && (
          <EuiFormRow
            label={i18n.translate('esqlControls.flyout.values.label', {
              defaultMessage: 'Values',
            })}
            helpText={i18n.translate('esqlControls.flyout.values.helpText', {
              defaultMessage:
                'Comma separated values (e.g. 5 minutes, 1 hour, 1 day, 1 week, 1 year)',
            })}
          >
            <EuiFieldText
              placeholder={i18n.translate('esqlControls.flyout.values.placeholder', {
                defaultMessage: 'Set the static values',
              })}
              value={values}
              onChange={onValuesChange}
              aria-label={i18n.translate('esqlControls.flyout.values.placeholder', {
                defaultMessage: 'Set a variable name',
              })}
            />
          </EuiFormRow>
        )}

        <EuiFormRow
          label={i18n.translate('esqlControls.flyout.label.label', {
            defaultMessage: 'Label',
          })}
          labelAppend={i18n.translate('esqlControls.flyout.label.extraLabel', {
            defaultMessage: 'Optional',
          })}
        >
          <EuiFieldText
            placeholder={i18n.translate('esqlControls.flyout.label.placeholder', {
              defaultMessage: 'Set a label',
            })}
            value={label}
            onChange={onLabelChange}
            aria-label={i18n.translate('esqlControls.flyout.label.placeholder', {
              defaultMessage: 'Set a label',
            })}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('esqlControls.flyout.minimumWidth.label', {
            defaultMessage: 'Minimum Width',
          })}
        >
          <EuiButtonGroup
            legend={i18n.translate('esqlControls.flyout.minimumWidth.label', {
              defaultMessage: 'Minimum Width',
            })}
            options={minimumWidthButtonGroup}
            idSelected={minimumWidth}
            onChange={(id) => onMinimumSizeChange(id)}
            type="single"
            isFullWidth
          />
        </EuiFormRow>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              id="lnsCancelEditOnFlyFlyout"
              onClick={closeFlyout}
              flush="left"
              aria-label={i18n.translate('esqlControls.flyout..cancelFlyoutAriaLabel', {
                defaultMessage: 'Cancel applied changes',
              })}
              data-test-subj="cancelEsqlControlsFlyoutButton"
            >
              {i18n.translate('esqlControls.flyout.cancelLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={createVariableControl}
              fill
              aria-label={i18n.translate('esqlControls.flyout..applyFlyoutAriaLabel', {
                defaultMessage: 'Apply changes',
              })}
              // disabled={Boolean(isNewPanel) ? false : !isSaveable}
              iconType="check"
              data-test-subj="saveEsqlControlsFlyoutButton"
            >
              {i18n.translate('esqlControls.flyout.saveLabel', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}
